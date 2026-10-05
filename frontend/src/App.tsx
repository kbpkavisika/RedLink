import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HospitalApprovalGate } from './auth/HospitalApprovalGate';
import { RedirectIfAuthenticated } from './auth/RedirectIfAuthenticated';
import { RequireAuth } from './auth/RequireAuth';
import { RoleRedirect } from './auth/RoleRedirect';
import { AppShell } from './components/layout/AppShell';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { DonorsPage } from './pages/admin/DonorsPage';
import { DonorHomePage } from './pages/donor/DonorHomePage';
import { HospitalsPage } from './pages/admin/HospitalsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterDonorPage } from './pages/RegisterDonorPage';
import { RegisterHospitalPage } from './pages/RegisterHospitalPage';
import { NewRequestPage } from './pages/hospital/NewRequestPage';
import { RequestDetailPage } from './pages/hospital/RequestDetailPage';

// Development only: in a production build this is null, so the gallery isn't bundled at all
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('./dev/ComponentGallery')) : null;

/*
 * Route map. Placeholders (ComingSoonPage) are replaced by real pages in the feature branches.
 *   public            /login, /register/*, /forgot-password
 *   any signed-in     /change-password
 *   HOSPITAL_STAFF    /hospital/*
 *   DONOR             /donor/*
 *   ADMIN             /admin/*
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleRedirect />} />

        {/* Public: signed-in users are sent to their home instead */}
        <Route element={<RedirectIfAuthenticated />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/donor" element={<RegisterDonorPage />} />
          <Route path="/register/hospital" element={<RegisterHospitalPage />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Signed in: every page below shares the app shell */}
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />

            <Route element={<RequireAuth role="HOSPITAL_STAFF" />}>
              {/* Until the hospital is approved, every page below shows its approval progress instead */}
              <Route element={<HospitalApprovalGate />}>
                <Route
                  path="/hospital"
                  element={<ComingSoonPage title="Your dashboard" description="Open requests and responses at a glance." />}
                />
                <Route
                  path="/hospital/requests"
                  element={<ComingSoonPage title="Requests" description="Every request your hospital has posted." />}
                />
                <Route path="/hospital/requests/new" element={<NewRequestPage />} />
                <Route path="/hospital/requests/:id" element={<RequestDetailPage />} />
              </Route>
            </Route>

            <Route element={<RequireAuth role="DONOR" />}>
              <Route
                path="/donor"
                element={<DonorHomePage />}
              />
              <Route
                path="/donor/requests"
                element={<ComingSoonPage title="Requests" description="Requests matching your blood group." />}
              />
              <Route
                path="/donor/history"
                element={<ComingSoonPage title="Donation history" description="Every donation you've made." />}
              />
              <Route
                path="/donor/profile"
                element={<ComingSoonPage title="Your profile" description="Your details and blood group." />}
              />
            </Route>

            <Route element={<RequireAuth role="ADMIN" />}>
              <Route path="/admin/hospitals" element={<HospitalsPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route
                path="/admin/requests"
                element={<ComingSoonPage title="All requests" description="Requests across every hospital." />}
              />
              <Route path="/admin/donors" element={<DonorsPage />} />
            </Route>
          </Route>
        </Route>

        {ComponentGallery && (
          <Route
            path="/dev/components"
            element={
              <Suspense fallback={null}>
                <ComponentGallery />
              </Suspense>
            }
          />
        )}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
