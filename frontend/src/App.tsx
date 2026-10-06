import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HospitalApprovalGate } from './auth/HospitalApprovalGate';
import { RedirectIfAuthenticated } from './auth/RedirectIfAuthenticated';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell } from './components/layout/AppShell';
import { FullPageLoader } from './components/layout/FullPageLoader';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Pages outside the main bundle: each is downloaded the first time someone opens it, so visitors to the home
 * page and sign-in don't download every dashboard. The pages use named exports, so pick the one we need.
 */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

const ChangePasswordPage = page(() => import('./pages/ChangePasswordPage'), 'ChangePasswordPage');
const AdminRequestsPage = page(() => import('./pages/admin/AdminRequestsPage'), 'AdminRequestsPage');
const DonorsPage = page(() => import('./pages/admin/DonorsPage'), 'DonorsPage');
const DonorHistoryPage = page(() => import('./pages/donor/DonorHistoryPage'), 'DonorHistoryPage');
const DonorHomePage = page(() => import('./pages/donor/DonorHomePage'), 'DonorHomePage');
const DonorProfilePage = page(() => import('./pages/donor/DonorProfilePage'), 'DonorProfilePage');
const DonorRequestsPage = page(() => import('./pages/donor/DonorRequestsPage'), 'DonorRequestsPage');
const HospitalsPage = page(() => import('./pages/admin/HospitalsPage'), 'HospitalsPage');
const UsersPage = page(() => import('./pages/admin/UsersPage'), 'UsersPage');
const ForgotPasswordPage = page(() => import('./pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const NotificationsPage = page(() => import('./pages/NotificationsPage'), 'NotificationsPage');
const RegisterDonorPage = page(() => import('./pages/RegisterDonorPage'), 'RegisterDonorPage');
const RegisterHospitalPage = page(() => import('./pages/RegisterHospitalPage'), 'RegisterHospitalPage');
const HospitalDashboardPage = page(() => import('./pages/hospital/HospitalDashboardPage'), 'HospitalDashboardPage');
const HospitalRequestsPage = page(() => import('./pages/hospital/HospitalRequestsPage'), 'HospitalRequestsPage');
const NewRequestPage = page(() => import('./pages/hospital/NewRequestPage'), 'NewRequestPage');
const RequestDetailPage = page(() => import('./pages/hospital/RequestDetailPage'), 'RequestDetailPage');

// Development only: in a production build this is null, so the gallery isn't bundled at all
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('./dev/ComponentGallery')) : null;

/*
 * Route map.
 *   everyone          /  (home page; signed-in users get "Dashboard")
 *   public            /login, /register/*, /forgot-password
 *   any signed-in     /change-password, /notifications
 *   HOSPITAL_STAFF    /hospital/*
 *   DONOR             /donor/*
 *   ADMIN             /admin/*
 */
export default function App() {
  return (
    <BrowserRouter>
      {/* Shown while a page outside the main bundle downloads (pages inside the app shell have their own) */}
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />

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
              <Route path="/notifications" element={<NotificationsPage />} />

              <Route element={<RequireAuth role="HOSPITAL_STAFF" />}>
                {/* Until the hospital is approved, every page below shows its approval progress instead */}
                <Route element={<HospitalApprovalGate />}>
                  <Route
                    path="/hospital"
                    element={<HospitalDashboardPage />}
                  />
                  <Route
                    path="/hospital/requests"
                    element={<HospitalRequestsPage />}
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
                  element={<DonorRequestsPage />}
                />
                <Route
                  path="/donor/history"
                  element={<DonorHistoryPage />}
                />
                <Route
                  path="/donor/profile"
                  element={<DonorProfilePage />}
                />
              </Route>

              <Route element={<RequireAuth role="ADMIN" />}>
                <Route path="/admin/hospitals" element={<HospitalsPage />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route
                  path="/admin/requests"
                  element={<AdminRequestsPage />}
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
      </Suspense>
    </BrowserRouter>
  );
}
