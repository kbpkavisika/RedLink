-- RedLink demo data for screenshots: 3 admins, 3 approved hospitals with one staff member each, and 3 donors,
-- plus months of activity (requests, replies, donations, notifications) so every dashboard has something to show.
--
-- Only adds rows. Some replies and donations come from the DevDataSeeder donors (@seed.redlink.lk) when they
-- exist; they are skipped otherwise. Times are relative to when you run it, so open requests are "posted
-- 2 hours ago" and stay open for 8 hours to 4 days (then the expiry job closes them).
--
-- Every account signs in with the sample password, Abc123456.
--
--   psql -h localhost -U postgres -d redLink -v ON_ERROR_STOP=1 -f scripts/demo-data.sql
--
-- Local databases only: never run it against the live site.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'amaya.wijesinghe@redlink.lk') THEN
        RAISE EXCEPTION 'The demo data is already in this database.';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- People and hospitals
-- ---------------------------------------------------------------------------
INSERT INTO users (email, password_hash, full_name, phone, role, created_at) VALUES
    ('amaya.wijesinghe@redlink.lk',   '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Amaya Wijesinghe',   '0772145830', 'ADMIN', now() - interval '11 months'),
    ('ravindu.jayasuriya@redlink.lk', '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Ravindu Jayasuriya', '0714587263', 'ADMIN', now() - interval '9 months'),
    ('shalini.fonseka@redlink.lk',    '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Shalini Fonseka',    '0765398412', 'ADMIN', now() - interval '4 months');

INSERT INTO hospitals (name, registration_no, address, city, phone, status, approved_by, approved_at, created_at) VALUES
    ('Colombo Lakeside Hospital', 'PHSRC/H/2017/0284', '142 Baseline Road, Colombo 09', 'Colombo', '0112694501', 'APPROVED',
     (SELECT id FROM users WHERE email = 'amaya.wijesinghe@redlink.lk'), now() - interval '8 months', now() - interval '8 months 2 days'),
    ('Hillcrest Medical Centre', 'PHSRC/H/2015/0137', '27 Peradeniya Road, Kandy', 'Kandy', '0812234876', 'APPROVED',
     (SELECT id FROM users WHERE email = 'ravindu.jayasuriya@redlink.lk'), now() - interval '7 months', now() - interval '7 months 1 day'),
    ('Southern Coast Hospital', 'PHSRC/H/2019/0451', '88 Matara Road, Galle', 'Galle', '0912245319', 'APPROVED',
     (SELECT id FROM users WHERE email = 'shalini.fonseka@redlink.lk'), now() - interval '6 months', now() - interval '6 months 3 days');

INSERT INTO users (email, password_hash, full_name, phone, role, hospital_id, created_at) VALUES
    ('harsha.gunawardena@lakesidehospital.lk', '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Harsha Gunawardena', '0773654120', 'HOSPITAL_STAFF',
     (SELECT id FROM hospitals WHERE registration_no = 'PHSRC/H/2017/0284'), now() - interval '8 months 2 days'),
    ('malsha.dissanayake@hillcrestmedical.lk', '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Malsha Dissanayake', '0718452367', 'HOSPITAL_STAFF',
     (SELECT id FROM hospitals WHERE registration_no = 'PHSRC/H/2015/0137'), now() - interval '7 months 1 day'),
    ('thilina.ekanayake@southerncoasthospital.lk', '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Thilina Ekanayake', '0756231894', 'HOSPITAL_STAFF',
     (SELECT id FROM hospitals WHERE registration_no = 'PHSRC/H/2019/0451'), now() - interval '6 months 3 days');

INSERT INTO users (email, password_hash, full_name, phone, role, created_at) VALUES
    ('sachini.abeywardena@gmail.com', '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Sachini Abeywardena', '0771948326', 'DONOR', now() - interval '10 months'),
    ('yohan.ratnayake@gmail.com',     '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Yohan Ratnayake',     '0703827451', 'DONOR', now() - interval '8 months'),
    ('imesha.kularatne@gmail.com',    '{bcrypt}$2a$10$ShF8YLt.3l7IEwgDbK5tQumGOhmHp47GIN4G2SJJRUji1NZmGt3.q', 'Imesha Kularatne',    '0769124738', 'DONOR', now() - interval '7 months');

-- last_donation_date is filled in by the donations below
INSERT INTO donors (user_id, blood_group, date_of_birth, city, available)
SELECT u.id, v.blood_group, v.date_of_birth, v.city, TRUE
FROM (VALUES
    ('sachini.abeywardena@gmail.com', 'O+', DATE '1996-04-18', 'Colombo'),
    ('yohan.ratnayake@gmail.com',     'B+', DATE '1991-09-02', 'Kandy'),
    ('imesha.kularatne@gmail.com',    'O-', DATE '1999-12-11', 'Galle')
) AS v (email, blood_group, date_of_birth, city)
JOIN users u ON u.email = v.email;

-- ---------------------------------------------------------------------------
-- Helpers (temporary: they disappear when this session ends)
-- ---------------------------------------------------------------------------

-- Which donor groups can give to which recipient (backend: BloodGroup.canDonateTo)
CREATE TEMP TABLE compat (donor VARCHAR(3), recipient VARCHAR(3)) ON COMMIT DROP;
INSERT INTO compat VALUES
    ('O-', 'O-'), ('O-', 'O+'), ('O-', 'A-'), ('O-', 'A+'), ('O-', 'B-'), ('O-', 'B+'), ('O-', 'AB-'), ('O-', 'AB+'),
    ('O+', 'O+'), ('O+', 'A+'), ('O+', 'B+'), ('O+', 'AB+'),
    ('A-', 'A-'), ('A-', 'A+'), ('A-', 'AB-'), ('A-', 'AB+'),
    ('A+', 'A+'), ('A+', 'AB+'),
    ('B-', 'B-'), ('B-', 'B+'), ('B-', 'AB-'), ('B-', 'AB+'),
    ('B+', 'B+'), ('B+', 'AB+'),
    ('AB-', 'AB-'), ('AB-', 'AB+'),
    ('AB+', 'AB+');

-- Older notifications have been read; the last 6 hours' are still unread
CREATE FUNCTION pg_temp.note(p_user BIGINT, p_request BIGINT, p_message TEXT, p_at TIMESTAMPTZ) RETURNS VOID
LANGUAGE sql AS $$
    INSERT INTO notifications (user_id, request_id, message, is_read, created_at)
    VALUES (p_user, p_request, p_message, p_at < now() - interval '6 hours', p_at);
$$;

-- Same wording as NotificationService.requestPosted
CREATE FUNCTION pg_temp.posted_message(p_request BIGINT) RETURNS TEXT
LANGUAGE sql AS $$
    SELECT CASE r.urgency WHEN 'CRITICAL' THEN 'Critical: ' WHEN 'HIGH' THEN 'Urgent: ' ELSE '' END
        || h.name || ' needs ' || r.units_needed || CASE WHEN r.units_needed = 1 THEN ' unit' ELSE ' units' END
        || ' of ' || r.blood_group || ' in ' || r.city || '. Request #RQ-' || r.id || '.'
    FROM blood_requests r JOIN hospitals h ON h.id = r.hospital_id
    WHERE r.id = p_request;
$$;

-- A request posted by p_staff, p_created ago, needed p_needed after posting, closed p_closed ago (unless OPEN)
CREATE FUNCTION pg_temp.request(p_staff TEXT, p_group TEXT, p_units INT, p_urgency TEXT, p_status TEXT,
                                p_created INTERVAL, p_needed INTERVAL, p_closed INTERVAL DEFAULT NULL) RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    v_staff users%ROWTYPE;
    v_id BIGINT;
BEGIN
    SELECT * INTO v_staff FROM users WHERE email = p_staff;
    INSERT INTO blood_requests (hospital_id, created_by, blood_group, units_needed, urgency, city, status,
                                needed_by, created_at, closed_at)
    SELECT v_staff.hospital_id, v_staff.id, p_group, p_units, p_urgency, h.city, p_status,
           now() - p_created + p_needed, now() - p_created,
           CASE WHEN p_status = 'OPEN' THEN NULL ELSE now() - p_closed END
    FROM hospitals h WHERE h.id = v_staff.hospital_id
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

-- What posting does (BloodRequestService.create): notify the top matches, as many as the urgency allows
CREATE FUNCTION pg_temp.notify_matches(p_request BIGINT) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    r blood_requests%ROWTYPE;
    v_count INT;
BEGIN
    SELECT * INTO r FROM blood_requests WHERE id = p_request;
    v_count := least(25, r.units_needed *
        CASE r.urgency WHEN 'LOW' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'HIGH' THEN 5 ELSE 8 END);

    -- Ranked like MatchRanking: exact group, same city, longest since donating (never first), donor id
    INSERT INTO notifications (user_id, request_id, message, is_read, created_at)
    SELECT d.user_id, r.id, pg_temp.posted_message(r.id),
           r.created_at < now() - interval '6 hours', r.created_at + interval '1 minute'
    FROM donors d
    JOIN users u ON u.id = d.user_id
    JOIN compat c ON c.donor = d.blood_group AND c.recipient = r.blood_group
    WHERE d.available AND u.enabled
      AND (d.last_donation_date IS NULL OR d.last_donation_date <= current_date - 90)
    ORDER BY d.blood_group = r.blood_group DESC,
             lower(trim(d.city)) = lower(trim(r.city)) DESC,
             d.last_donation_date NULLS FIRST,
             d.id
    LIMIT v_count;
END $$;

-- A donor's reply, p_ago ago. Accepting tells the hospital's staff, as DonorResponseService does.
-- Skips donors that aren't in this database (the @seed ones are optional).
CREATE FUNCTION pg_temp.respond(p_request BIGINT, p_email TEXT, p_status TEXT, p_ago INTERVAL) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_donor donors%ROWTYPE;
    v_user users%ROWTYPE;
    r blood_requests%ROWTYPE;
    v_at TIMESTAMPTZ := now() - p_ago;
BEGIN
    SELECT d.* INTO v_donor FROM donors d JOIN users u ON u.id = d.user_id WHERE u.email = p_email;
    IF NOT FOUND THEN
        RAISE NOTICE 'Skipped a reply from % (not in this database)', p_email;
        RETURN;
    END IF;
    SELECT * INTO v_user FROM users WHERE id = v_donor.user_id;
    SELECT * INTO r FROM blood_requests WHERE id = p_request;

    INSERT INTO donor_responses (request_id, donor_id, status, responded_at, updated_at)
    VALUES (p_request, v_donor.id, p_status, v_at, v_at);

    -- They replied, so they were told about it
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE request_id = p_request AND user_id = v_user.id) THEN
        PERFORM pg_temp.note(v_user.id, p_request, pg_temp.posted_message(p_request), r.created_at + interval '1 minute');
    END IF;

    IF p_status = 'ACCEPTED' THEN
        PERFORM pg_temp.note(s.id, p_request,
                             format('%s (%s) can donate for #RQ-%s. Call %s to confirm.',
                                    v_user.full_name, v_donor.blood_group, p_request, coalesce(v_user.phone, 'them')),
                             v_at)
        FROM users s WHERE s.hospital_id = r.hospital_id AND s.enabled;
    END IF;
END $$;

-- Recorded when a request is closed as fulfilled: 1 unit on the closing day, and the donor's 90-day clock restarts
CREATE FUNCTION pg_temp.donate(p_request BIGINT, p_email TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_donor donors%ROWTYPE;
    r blood_requests%ROWTYPE;
    v_day DATE;
    v_hospital TEXT;
BEGIN
    SELECT d.* INTO v_donor FROM donors d JOIN users u ON u.id = d.user_id WHERE u.email = p_email;
    IF NOT FOUND THEN
        RAISE NOTICE 'Skipped a donation by % (not in this database)', p_email;
        RETURN;
    END IF;
    SELECT * INTO r FROM blood_requests WHERE id = p_request;
    SELECT name INTO v_hospital FROM hospitals WHERE id = r.hospital_id;
    v_day := r.closed_at::date;

    INSERT INTO donations (donor_id, hospital_id, request_id, donation_date, units)
    VALUES (v_donor.id, r.hospital_id, r.id, v_day, 1);
    UPDATE donors SET last_donation_date = greatest(last_donation_date, v_day) WHERE id = v_donor.id;

    PERFORM pg_temp.note(v_donor.user_id, r.id,
                         format('Thank you for donating at %s (#RQ-%s). You can donate again from %s.',
                                v_hospital, r.id, to_char(v_day + 90, 'FMDD Mon YYYY')),
                         r.closed_at);
END $$;

-- ---------------------------------------------------------------------------
-- Activity: closed requests first (their donations decide who is eligible now), then the open ones
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    lakeside  CONSTANT TEXT := 'harsha.gunawardena@lakesidehospital.lk';
    hillcrest CONSTANT TEXT := 'malsha.dissanayake@hillcrestmedical.lk';
    southern  CONSTANT TEXT := 'thilina.ekanayake@southerncoasthospital.lk';
    r BIGINT;
BEGIN
    -- Staff heard their hospital was approved
    PERFORM pg_temp.note(u.id, NULL, h.name || ' was approved. You can now post blood requests.', h.approved_at)
    FROM users u JOIN hospitals h ON h.id = u.hospital_id
    WHERE u.email IN (lakeside, hillcrest, southern);

    -- Colombo Lakeside Hospital: history
    r := pg_temp.request(lakeside, 'O+', 2, 'HIGH', 'FULFILLED', '262 days', '1 day', '261 days');
    PERFORM pg_temp.respond(r, 'sachini.abeywardena@gmail.com', 'ACCEPTED', '261 days 20 hours');
    PERFORM pg_temp.donate(r, 'sachini.abeywardena@gmail.com');

    r := pg_temp.request(lakeside, 'O+', 1, 'MEDIUM', 'FULFILLED', '127 days', '2 days', '126 days');
    PERFORM pg_temp.respond(r, 'sachini.abeywardena@gmail.com', 'ACCEPTED', '126 days 22 hours');
    PERFORM pg_temp.donate(r, 'sachini.abeywardena@gmail.com');

    r := pg_temp.request(lakeside, 'A-', 1, 'LOW', 'CANCELLED', '45 days', '3 days', '44 days');

    r := pg_temp.request(lakeside, 'AB+', 2, 'HIGH', 'FULFILLED', '27 days', '1 day', '26 days');
    PERFORM pg_temp.respond(r, 'nimali.fernando@seed.redlink.lk', 'ACCEPTED', '26 days 21 hours');
    PERFORM pg_temp.respond(r, 'mohamed.rizwan@seed.redlink.lk', 'ACCEPTED', '26 days 19 hours');
    PERFORM pg_temp.donate(r, 'nimali.fernando@seed.redlink.lk');
    PERFORM pg_temp.donate(r, 'mohamed.rizwan@seed.redlink.lk');

    -- Hillcrest Medical Centre: history
    r := pg_temp.request(hillcrest, 'B+', 2, 'MEDIUM', 'FULFILLED', '212 days', '2 days', '211 days');
    PERFORM pg_temp.respond(r, 'yohan.ratnayake@gmail.com', 'ACCEPTED', '211 days 21 hours');
    PERFORM pg_temp.donate(r, 'yohan.ratnayake@gmail.com');

    r := pg_temp.request(hillcrest, 'A-', 1, 'LOW', 'EXPIRED', '60 days', '3 days', '57 days');

    r := pg_temp.request(hillcrest, 'B+', 1, 'HIGH', 'FULFILLED', '25 days', '1 day', '24 days');
    PERFORM pg_temp.respond(r, 'yohan.ratnayake@gmail.com', 'ACCEPTED', '24 days 20 hours');
    PERFORM pg_temp.donate(r, 'yohan.ratnayake@gmail.com');

    -- Southern Coast Hospital: history
    r := pg_temp.request(southern, 'O-', 1, 'CRITICAL', 'FULFILLED', '161 days', '12 hours', '160 days 20 hours');
    PERFORM pg_temp.respond(r, 'imesha.kularatne@gmail.com', 'ACCEPTED', '160 days 23 hours');
    PERFORM pg_temp.donate(r, 'imesha.kularatne@gmail.com');

    r := pg_temp.request(southern, 'B-', 1, 'MEDIUM', 'FULFILLED', '16 days', '2 days', '15 days');
    PERFORM pg_temp.respond(r, 'lahiru.mendis@seed.redlink.lk', 'ACCEPTED', '15 days 22 hours');
    PERFORM pg_temp.donate(r, 'lahiru.mendis@seed.redlink.lk');

    -- Open now, oldest first
    r := pg_temp.request(southern, 'A+', 2, 'LOW', 'OPEN', '2 days', '6 days');
    PERFORM pg_temp.notify_matches(r);

    r := pg_temp.request(lakeside, 'B-', 1, 'MEDIUM', 'OPEN', '26 hours', '4 days');
    PERFORM pg_temp.notify_matches(r);

    r := pg_temp.request(southern, 'O-', 1, 'MEDIUM', 'OPEN', '22 hours', '3 days');
    PERFORM pg_temp.notify_matches(r);
    PERFORM pg_temp.respond(r, 'arjun.navaratnam@seed.redlink.lk', 'DECLINED', '19 hours');

    r := pg_temp.request(lakeside, 'A+', 2, 'HIGH', 'OPEN', '5 hours', '2 days');
    PERFORM pg_temp.notify_matches(r);
    PERFORM pg_temp.respond(r, 'dilshan.wickramasinghe@seed.redlink.lk', 'ACCEPTED', '3 hours 10 minutes');

    r := pg_temp.request(hillcrest, 'B+', 2, 'HIGH', 'OPEN', '3 hours', '1 day 6 hours');
    PERFORM pg_temp.notify_matches(r);
    PERFORM pg_temp.respond(r, 'tharushi.jayawardena@seed.redlink.lk', 'ACCEPTED', '2 hours 5 minutes');

    r := pg_temp.request(lakeside, 'O+', 3, 'CRITICAL', 'OPEN', '2 hours', '14 hours');
    PERFORM pg_temp.notify_matches(r);
    PERFORM pg_temp.respond(r, 'sachini.abeywardena@gmail.com', 'ACCEPTED', '1 hour 35 minutes');
    PERFORM pg_temp.respond(r, 'kamal.perera@seed.redlink.lk', 'ACCEPTED', '1 hour 10 minutes');
    PERFORM pg_temp.respond(r, 'tharushi.jayawardena@seed.redlink.lk', 'DECLINED', '50 minutes');

    r := pg_temp.request(hillcrest, 'O-', 2, 'CRITICAL', 'OPEN', '40 minutes', '9 hours');
    PERFORM pg_temp.notify_matches(r);
    PERFORM pg_temp.respond(r, 'imesha.kularatne@gmail.com', 'ACCEPTED', '25 minutes');
END $$;

COMMIT;
