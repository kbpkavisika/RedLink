package com.redlink.backend.service;

import com.redlink.backend.dto.request.BloodRequestDetail;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.Notification;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.repository.NotificationRepository;
import com.redlink.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Every in-app notification is written here, in the same transaction as the change it reports
 * (if the change fails, no notification is left behind). Who hears about what:
 *
 *   request posted        → the top matches              (H6, D11)
 *   donor accepts         → the hospital's staff
 *   donor withdraws       → the hospital's staff
 *   request fulfilled     → donors who gave: thanks; donors who accepted but didn't give: no longer needed
 *   request cancelled     → donors who had accepted
 *   request expired       → donors who had accepted     (RequestExpiryService)
 *   hospital decided      → that hospital's staff         (approved, or rejected with the reason)
 *
 * Declines aren't reported, to keep the noise down. In-app only for now; email/SMS would be a later addition.
 */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class NotificationService {

    // notifications.message is VARCHAR(500)
    static final int MAX_MESSAGE = 500;
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    // e.g. "Urgent: National Hospital Colombo needs 2 units of O+ in Colombo. Request #RQ-1043."
    public void requestPosted(BloodRequest request, Collection<User> donors) {
        String prefix = switch (request.getUrgency()) {
            case CRITICAL -> "Critical: ";
            case HIGH -> "Urgent: ";
            case LOW, MEDIUM -> "";
        };
        int units = request.getUnitsNeeded();
        send(donors, request, "%s%s needs %d %s of %s in %s. Request #%s.".formatted(
                prefix, request.getHospital().getName(), units, units == 1 ? "unit" : "units",
                request.getBloodGroup().getLabel(), request.getCity(), reference(request)));
    }

    public void donorAccepted(BloodRequest request, Donor donor) {
        send(staffOf(request.getHospital()), request, "%s (%s) can donate for #%s. Call %s to confirm."
                .formatted(donor.getUser().getFullName(), donor.getBloodGroup().getLabel(), reference(request),
                        donor.getUser().getPhone() == null ? "them" : donor.getUser().getPhone()));
    }

    // README "Donor response lifecycle": "Kamal Perera can no longer donate for #RQ-5"
    public void donorWithdrew(BloodRequest request, Donor donor) {
        send(staffOf(request.getHospital()), request, "%s can no longer donate for #%s."
                .formatted(donor.getUser().getFullName(), reference(request)));
    }

    /**
     * After a request is fulfilled or cancelled, tell everyone who had accepted it what happened.
     *
     * @param accepted donors who had ACCEPTED
     * @param donated  the ones recorded as having given blood (empty when cancelled)
     * @param nextEligible the donors' new next eligible date (only used when fulfilled)
     */
    public void requestClosed(BloodRequest request, Collection<Donor> accepted, Set<Long> donated, LocalDate nextEligible) {
        String hospital = request.getHospital().getName();
        for (Donor donor : accepted) {
            String message;
            if (request.getStatus() == RequestStatus.CANCELLED) {
                message = "#%s at %s was cancelled. It's no longer needed, thank you for offering to help."
                        .formatted(reference(request), hospital);
            } else if (request.getStatus() == RequestStatus.EXPIRED) {
                message = "#%s at %s has expired. It's no longer needed, thank you for offering to help."
                        .formatted(reference(request), hospital);
            } else if (donated.contains(donor.getId())) {
                message = "Thank you for donating at %s (#%s). You can donate again from %s."
                        .formatted(hospital, reference(request), nextEligible.format(DAY));
            } else {
                message = "#%s at %s has been fulfilled. It's no longer needed, thank you for offering to help."
                        .formatted(reference(request), hospital);
            }
            send(List.of(donor.getUser()), request, message);
        }
    }

    public void hospitalDecided(Hospital hospital) {
        String message = hospital.getStatus() == HospitalStatus.APPROVED
                ? "%s was approved. You can now post blood requests.".formatted(hospital.getName())
                : "%s wasn't approved: %s".formatted(hospital.getName(), hospital.getRejectionReason());
        send(staffOf(hospital), null, message);
    }

    // Everyone who works at the hospital and can still sign in
    private List<User> staffOf(Hospital hospital) {
        return userRepository.findAllByHospitalIdOrderByCreatedAtAsc(hospital.getId()).stream()
                .filter(User::isEnabled)
                .toList();
    }

    private void send(Collection<User> recipients, BloodRequest request, String message) {
        String text = message.length() <= MAX_MESSAGE ? message : message.substring(0, MAX_MESSAGE - 1) + "…";
        notificationRepository.saveAll(recipients.stream().map(user -> {
            Notification notification = new Notification();
            notification.setUser(user);
            notification.setRequest(request);
            notification.setMessage(text);
            return notification;
        }).toList());
    }

    private static String reference(BloodRequest request) {
        return BloodRequestDetail.reference(request.getId());
    }
}
