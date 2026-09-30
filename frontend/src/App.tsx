import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RedirectIfAuthenticated } from './auth/RedirectIfAuthenticated';
import { RequireAuth } from './auth/RequireAuth';
import { RoleRedirect } from './auth/RoleRedirect';
import { AppShell } from './components/layout/AppShell';
import { PublicLayout } from './components/layout/PublicLayout';
import { ComingSoonPage } from './pages/ComingSoonPage';
import Donors from './pages/Donors';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NewRequestPage } from './pages/hospital/NewRequestPage';

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
          <Route
            path="/register/donor"
            element={
              <PublicLayout>
                <ComingSoonPage title="Donor registration" description="Built in the authentication branch." />
              </PublicLayout>
            }
          />
          <Route
            path="/register/hospital"
            element={
              <PublicLayout>
                <ComingSoonPage title="Hospital registration" description="Built in the authentication branch." />
              </PublicLayout>
            }
          />
        </Route>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Signed in: every page below shares the app shell */}
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route
              path="/change-password"
              element={<ComingSoonPage title="Change password" description="Built in the authentication branch." />}
            />

            <Route element={<RequireAuth role="HOSPITAL_STAFF" />}>
              <Route
                path="/hospital"
                element={<ComingSoonPage title="Your dashboard" description="Open requests and responses at a glance." />}
              />
              <Route
                path="/hospital/requests"
                element={<ComingSoonPage title="Requests" description="Every request your hospital has posted." />}
              />
              <Route path="/hospital/requests/new" element={<NewRequestPage />} />
              <Route
                path="/hospital/requests/:id"
                element={<ComingSoonPage title="Request detail" description="Matched donors and their responses." />}
              />
            </Route>

            <Route element={<RequireAuth role="DONOR" />}>
              <Route
                path="/donor"
                element={<ComingSoonPage title="Your home" description="Eligibility, availability and requests that need you." />}
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
              <Route
                path="/admin/hospitals"
                element={<ComingSoonPage title="Hospital approvals" description="Hospitals waiting for review." />}
              />
              <Route
                path="/admin/users"
                element={<ComingSoonPage title="Users" description="Add staff and reset passwords." />}
              />
              <Route
                path="/admin/requests"
                element={<ComingSoonPage title="All requests" description="Requests across every hospital." />}
              />
              <Route path="/admin/donors" element={<Donors />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
