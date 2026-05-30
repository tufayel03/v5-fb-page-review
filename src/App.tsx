import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  Outlet,
} from "react-router";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  ChevronRight,
  FileText,
  SquarePen,
  Store,
  Lock,
  Home as HomeIcon,
  MessageSquare,
} from "lucide-react";
import React, { useState, useEffect, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import RouteLoader from "./components/RouteLoader";

let lastTrackedPath = "";

function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    if (lastTrackedPath === location.pathname) return;
    lastTrackedPath = location.pathname;

    let visitorId = localStorage.getItem("fbp_visitor_id");
    if (!visitorId) {
      visitorId = "vis_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("fbp_visitor_id", visitorId);
    }

    fetch("/api/track-visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visitorId,
        path: location.pathname,
      }),
    }).catch((err) => {
      console.warn("Analytics tracking failure:", err);
    });

    // Dynamic SEO Titles mapping
    const path = location.pathname;
    let title = "FB Page Review | Verify Online Sellers & Avoid bKash Scams";
    
    if (path === "/") {
      title = "FB Page Review | Verify Online Sellers & Avoid bKash Scams";
    } else if (path.startsWith("/fraud-pages")) {
      title = "Detected Fraud Pages Directory - Safe Online Buying Guide | FB Page Review";
    } else if (path === "/blog") {
      title = "Latest Security News & Help Guides | FB Page Review Blog";
    } else if (path === "/write-review") {
      title = "Write a Review for a Facebook Page - Check Scores | FB Page Review";
    } else if (path === "/login") {
      title = "Sign In to Your Account | FB Page Review";
    } else if (path === "/register") {
      title = "Create a Free Account | FB Page Review";
    } else if (path === "/forgot-password") {
      title = "Forgot Password Recovery | FB Page Review";
    } else if (path === "/reset-password") {
      title = "Reset Your Password - Secure Access | FB Page Review";
    } else if (path.startsWith("/dashboard")) {
      title = "User Dashboard | FB Page Review";
    } else if (path.startsWith("/admin")) {
      title = "Admin Panel - System Operations | FB Page Review";
    } else if (path.startsWith("/business")) {
      title = "Business Manager - Page Performance Logs | FB Page Review";
    } else if (path === "/about") {
      title = "About Us - Our Mission for Safer E-commerce | FB Page Review";
    } else if (path === "/contact") {
      title = "Contact Us - Support & Business Inquiries | FB Page Review";
    } else if (path === "/terms") {
      title = "Terms & Conditions of Service | FB Page Review";
    } else if (path === "/privacy") {
      title = "Privacy Policy & Data Security | FB Page Review";
    }

    if (!path.startsWith("/page/") && !path.startsWith("/blog/") && !path.startsWith("/posts/")) {
      document.title = title;
    }
  }, [location.pathname]);

  return null;
}

// Placeholders for Pages (Route-based lazy loading)
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/public/About"));
const Contact = lazy(() => import("./pages/public/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/public/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/public/Terms"));
const Disclaimer = lazy(() => import("./pages/public/Disclaimer"));
const ReviewGuidelines = lazy(() => import("./pages/public/ReviewGuidelines"));
const HowReviewsWork = lazy(() => import("./pages/public/HowReviewsWork"));
const DisputePolicy = lazy(() => import("./pages/public/DisputePolicy"));
const ContentRemovalPolicy = lazy(() => import("./pages/public/ContentRemovalPolicy"));
const PageProfile = lazy(() => import("./pages/PageProfile"));
const WriteReview = lazy(() => import("./pages/WriteReview"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GlobalSearch = lazy(() => import("./pages/GlobalSearch"));
const FraudDirectory = lazy(() => import("./pages/FraudDirectory"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));
const AdminPageDetails = lazy(() => import("./pages/admin/AdminPageDetails"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminReviewDetails = lazy(() => import("./pages/admin/AdminReviewDetails"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminContactNumbers = lazy(() => import("./pages/admin/AdminContactNumbers"));
const AdminContactNumberDetails = lazy(() => import("./pages/admin/AdminContactNumberDetails"));
const AdminPageClaims = lazy(() => import("./pages/admin/AdminPageClaims"));
const AdminPageClaimDetails = lazy(() => import("./pages/admin/AdminPageClaimDetails"));
const AdminDisputes = lazy(() => import("./pages/admin/AdminDisputes"));
const AdminDisputeDetails = lazy(() => import("./pages/admin/AdminDisputeDetails"));

const AdminBlogPosts = lazy(() => import("./pages/admin/AdminBlogPosts"));
const AdminBlogPostDetails = lazy(() => import("./pages/admin/AdminBlogPostDetails"));
const AdminMediaLibrary = lazy(() => import("./pages/admin/AdminMediaLibrary"));
const AdminAbuseReports = lazy(() => import("./pages/admin/AdminAbuseReports"));
const AdminAbuseReportDetails = lazy(() => import("./pages/admin/AdminAbuseReportDetails"));
const AdminBulkImport = lazy(() => import("./pages/admin/AdminBulkImport"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminMessageDetails = lazy(() => import("./pages/admin/AdminMessageDetails"));

const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));

const BusinessLayout = lazy(() => import("./pages/business/BusinessLayout"));
const BusinessOverview = lazy(() => import("./pages/business/BusinessOverview"));
const BusinessPages = lazy(() => import("./pages/business/BusinessPages"));
const BusinessReviews = lazy(() => import("./pages/business/BusinessReviews"));
const BusinessProfileInfo = lazy(() => import("./pages/business/BusinessProfileInfo"));
const BusinessContactNumbers = lazy(() => import("./pages/business/BusinessContactNumbers"));
const BusinessSettings = lazy(() => import("./pages/business/BusinessSettings"));
const BusinessClaimPage = lazy(() => import("./pages/business/BusinessClaimPage"));

import Footer from "./components/Footer";

function StandardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const [publicSettings, setPublicSettings] = useState<any>({});

  useEffect(() => {
    fetch("/api/public-settings")
      .then((res) => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return {};
      })
      .then((data: any) => {
        setPublicSettings(data);
        if (data.site_logo) {
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = data.site_logo;
        }

        // Dynamically inject site ownership head verification snippet/meta tags
        if (data.head_verification_code) {
          const existing = document.getElementById("head-verification-block");
          if (existing) existing.remove();

          const block = document.createElement("div");
          block.id = "head-verification-block";
          block.style.display = "none";
          document.head.appendChild(block);

          try {
            const range = document.createRange();
            range.selectNode(block);
            const fragment = range.createContextualFragment(data.head_verification_code);
            block.appendChild(fragment);
          } catch (e) {
            console.error("Head verification snippet injection failure:", e);
          }
        }
      })
      .catch(() => {});
  }, []);

  const isFraudPagesActive = location.pathname.startsWith("/fraud-pages");
  const isBlogActive =
    location.pathname.startsWith("/blog") ||
    location.pathname.startsWith("/blog/");
  const isWriteReviewActive = location.pathname.startsWith("/write-review");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-16 md:pb-0">
      <header className="sticky top-0 z-50 transition-colors duration-300 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 sm:px-8 h-18 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            {publicSettings.site_logo ? (
              <img
                src={publicSettings.site_logo}
                alt={publicSettings.site_name || "Logo"}
                referrerPolicy="no-referrer"
                className="max-h-12 max-w-[160px] object-contain select-none"
              />
            ) : (
              <>
                <div className="w-10 h-10 shrink-0 bg-[#0fbc6f] rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-xs select-none">
                  {(publicSettings.site_name || "FB Page Review").charAt(0)}
                </div>
                <span className="text-[19px] font-black tracking-tight text-slate-900 select-none">
                  {publicSettings.site_name ? (
                    publicSettings.site_name
                  ) : (
                    <>
                      FB <span className="text-[#0fbc6f]">Page Review</span>
                    </>
                  )}
                </span>
              </>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 h-full text-[13.5px] font-extrabold text-slate-800">
            {/* Home */}
            <Link
              to="/"
              className={`flex items-center gap-2 h-18 border-b-3 transition-colors shrink-0 outline-none select-none ${
                location.pathname === "/"
                  ? "border-emerald-500 text-slate-900 font-black"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <HomeIcon
                className={`w-4.5 h-4.5 transition-colors ${location.pathname === "/" ? "text-slate-950" : "text-slate-500"}`}
              />
              <span>Home</span>
            </Link>

            {/* Detected Fraud Pages */}
            <Link
              to="/fraud-pages"
              className={`flex items-center gap-2 h-18 border-b-3 transition-colors shrink-0 outline-none select-none ${
                isFraudPagesActive
                  ? "border-[#f43f5e] text-[#f43f5e] font-black"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck
                className={`w-4.5 h-4.5 transition-colors ${isFraudPagesActive ? "text-[#f43f5e]" : "text-slate-500"}`}
              />
              <span>Detected Fraud Pages</span>
            </Link>

            {/* Blog */}
            <Link
              to="/blog"
              className={`flex items-center gap-2 h-18 border-b-3 transition-colors shrink-0 outline-none select-none ${
                isBlogActive
                  ? "border-emerald-500 text-slate-900 font-black"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText
                className={`w-4.5 h-4.5 transition-colors ${isBlogActive ? "text-slate-950" : "text-slate-500"}`}
              />
              <span>Blog</span>
            </Link>

            {/* Write a Review - special Highlight style from mockup */}
            {(!user ||
              (user.role !== "owner" &&
                user.role !== "page_owner" &&
                user.role !== "admin" &&
                user.role !== "super_admin")) && (
              <Link
                to="/write-review"
                className={`flex items-center gap-2 h-18 border-b-3 transition-colors shrink-0 outline-none select-none ${
                  isWriteReviewActive
                    ? "border-emerald-500 text-[#0fbc6f] font-black"
                    : "border-transparent text-[#0fbc6f] hover:text-[#0da662]"
                }`}
              >
                <SquarePen className="w-4.5 h-4.5 text-[#0fbc6f]" />
                <span>Write a Review</span>
              </Link>
            )}

            {/* Right Group: Account / Business login */}
            <div className="flex items-center gap-4 ml-2 self-center">
              <div className="flex items-center gap-3 border-l pl-5 border-slate-200 h-6">
                {user ? (
                  <>
                    {[
                      "owner",
                      "page_owner",
                      "Business Owner",
                      "admin",
                      "Admin",
                      "Super Admin",
                      "Moderator",
                    ].includes(user?.role || "") ? (
                      <Link
                        to="/business-dashboard"
                        className="text-indigo-600 hover:text-indigo-700 font-extrabold transition-colors text-sm"
                      >
                        Business Dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/dashboard"
                        className="text-slate-800 hover:text-emerald-600 font-extrabold transition-colors text-sm"
                      >
                        @{user.username}
                      </Link>
                    )}
                    {["admin", "Admin", "Super Admin", "Moderator"].includes(
                      user?.role || "",
                    ) && (
                      <Link
                        to="/tufayel"
                        className="text-blue-600 hover:text-blue-700 font-extrabold transition-colors text-sm ml-2"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="text-slate-400 hover:text-rose-600 transition-colors ml-2 cursor-pointer outline-none"
                      title="Log Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-slate-800 hover:text-[#0fbc6f] transition-colors font-extrabold tracking-tight px-1 py-1.5 select-none text-[13.5px]"
                    >
                      Log In
                    </Link>

                    <div className="h-6 w-px bg-slate-200 shrink-0 select-none" />

                    <Link
                      to="/business/login"
                      className="bg-[#111827] hover:bg-slate-900 text-white font-extrabold text-[12.5px] tracking-tight px-4.5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 shrink-0 select-none shadow-3xs border border-slate-800"
                    >
                      <Store className="w-4 h-4 text-[#10b981] shrink-0" />
                      <span>For businesses</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/90 shrink-0 ml-0.5" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>

          {/* Mobile Nav Toggle */}
          <div className="flex md:hidden items-center gap-1">
            <button
              className="p-2 cursor-pointer outline-none text-[#0fbc6f]"
              onClick={() => {
                if (window.location.pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  window.dispatchEvent(new Event("open-mobile-search"));
                } else {
                  window.location.href = "/?search=true";
                }
              }}
              aria-label="Search"
            >
              <Search className="h-6 w-6 font-black" />
            </button>
          </div>
        </div>

        {/* Mobile Slide-in Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-x-0 bottom-0 top-[64px] z-[40] bg-black/50 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Slide-in Menu Panel */}
        <div
          className={`md:hidden fixed inset-y-0 right-0 top-[64px] z-[45] w-[85%] sm:w-[350px] bg-white text-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? "translate-x-0" : "translate-x-[100%]"}`}
        >
          <div className="p-4 overflow-y-auto h-full pb-24 hide-scrollbar">
            <Link
              to="/business/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full py-3 mb-6 bg-transparent border border-slate-800 rounded-full font-bold text-sm text-center hover:bg-slate-50 transition-colors"
            >
              For businesses
            </Link>

            {user && (
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base">{user.username}</span>
                  <span className="text-sm text-slate-500 tracking-wide uppercase">
                    BD
                  </span>
                </div>
              </div>
            )}

            <nav className="flex flex-col space-y-5 font-bold text-base">
              {user && (
                <>
                  {[
                    "owner",
                    "page_owner",
                    "Business Owner",
                    "admin",
                    "Admin",
                    "Super Admin",
                    "Moderator",
                  ].includes(user?.role || "") ? (
                    <Link
                      to="/business-dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-indigo-600"
                    >
                      Business Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="hover:text-emerald-600"
                      >
                        My Reviews
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="hover:text-emerald-600"
                      >
                        My Settings
                      </Link>
                    </>
                  )}
                </>
              )}
              <Link
                to="/fraud-pages"
                onClick={() => setMobileMenuOpen(false)}
                className="text-rose-600 hover:text-rose-700"
              >
                Detected Fraud Pages
              </Link>
              <Link
                to="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-emerald-600"
              >
                Blog
              </Link>
              <Link
                to="/help"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-emerald-600"
              >
                Help
              </Link>

              {user ? (
                <>
                  {["admin", "Admin", "Super Admin", "Moderator"].includes(
                    user?.role || "",
                  ) && (
                    <Link
                      to="/tufayel"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-indigo-600"
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-indigo-600 text-left pt-2 flex items-center gap-2 font-bold hover:text-indigo-700 transition-colors"
                  >
                    Log out <span className="text-lg">→</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="h-px bg-slate-100 my-2"></div>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-emerald-600"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-emerald-600"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>

            {(!user ||
              (user.role !== "owner" &&
                user.role !== "page_owner" &&
                user.role !== "admin" &&
                user.role !== "super_admin")) && (
              <div className="mt-5">
                <Link
                  to="/write-review"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-emerald-600 hover:text-emerald-700 transition-colors font-bold"
                >
                  Write a Review
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />

      {/* Mobile Bottom Navigation Menu */}
      <div className="fixed bottom-0 inset-x-0 z-[48] bg-white border-t border-slate-200 h-16 md:hidden flex items-center justify-around px-2 pb-safe shadow-[0_-3px_12px_rgba(0,0,0,0.06)]">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors outline-none ${
            location.pathname === "/"
              ? "text-[#0fbc6f]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <HomeIcon className="w-[21px] h-[21px] shrink-0" />
          <span className="text-[10px] font-black tracking-tight">Home</span>
        </Link>

        <Link
          to="/fraud-pages"
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors outline-none ${
            location.pathname.startsWith("/fraud-pages")
              ? "text-[#f43f5e]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShieldAlert className="w-[21px] h-[21px] shrink-0" />
          <span className="text-[10px] font-black tracking-tight text-center">
            Fraud Pages
          </span>
        </Link>

        <Link
          to="/write-review"
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors outline-none ${
            location.pathname.startsWith("/write-review")
              ? "text-[#0fbc6f]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="w-[21px] h-[21px] shrink-0" />
          <span className="text-[10px] font-black tracking-tight text-center">
            Reviews
          </span>
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors outline-none cursor-pointer ${
            mobileMenuOpen
              ? "text-[#0fbc6f]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Menu className="w-[21px] h-[21px] shrink-0" />
          <span className="text-[10px] font-black tracking-tight text-center">
            Menu
          </span>
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="p-20 text-center font-bold text-slate-500">
        Loading...
      </div>
    );
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="p-20 text-center font-bold text-slate-500">
        Loading...
      </div>
    );
  if (
    !user ||
    !["admin", "Admin", "Super Admin", "Moderator"].includes(user.role)
  )
    return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function BusinessOwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="p-20 text-center font-bold text-slate-500">
        Loading...
      </div>
    );
  if (
    !user ||
    ![
      "owner",
      "page_owner",
      "Business Owner",
      "admin",
      "Admin",
      "Super Admin",
      "Moderator",
    ].includes(user.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function BusinessPublicLayout() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isLogin = location.pathname.includes("/login");

  return (
    <div className="min-h-screen bg-[#f3f6fc] flex flex-col font-sans text-slate-800 relative overflow-x-hidden">
      <header className="bg-[#0b1329] border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 h-16 shrink-0">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 bg-[#10b981] rounded-xl flex items-center justify-center text-white font-extrabold text-xl select-none">
              F
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white leading-none">
                FB <span className="text-[#10b981]">Business</span>
              </span>
              <span className="text-[11px] text-slate-400 font-bold tracking-normal mt-0.5">
                FB Page Review
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4 text-sm font-semibold">
            {user ? (
              <>
                {[
                  "owner",
                  "page_owner",
                  "Business Owner",
                  "admin",
                  "Admin",
                  "Super Admin",
                  "Moderator",
                ].includes(user?.role || "") ? (
                  <Link
                    to="/business-dashboard"
                    className="text-[#10b981] hover:text-[#0fa5e9] transition-colors font-bold"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="text-[#10b981] hover:text-[#0fa5e9] transition-colors font-bold"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-white transition-colors ml-2 sm:ml-4"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/business/login"
                  className={`hidden sm:inline-block text-[13.5px] font-extrabold transition-colors ${isLogin ? "text-[#10b981]" : "text-slate-300 hover:text-white"}`}
                >
                  Business Log In
                </Link>
                <div className="hidden sm:block w-px h-5 bg-white/10" />
                <Link
                  to="/business/register"
                  className="hidden sm:inline-block px-5 py-2.5 bg-[#10b981] hover:bg-[#0da662] text-white rounded-full transition-colors text-[13px] font-extrabold shadow-sm"
                >
                  Business Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="p-1 sm:p-2 text-slate-400 hover:text-white md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </nav>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && !user && (
          <div className="md:hidden bg-[#0b1329] border-b border-white/5 p-4 flex flex-col gap-3">
            <Link
              to="/business/login"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full text-center py-2.5 font-bold text-sm rounded-xl transition-colors ${isLogin ? "bg-[#10b981] text-white" : "text-slate-300 hover:bg-slate-800"}`}
            >
              Business Log In
            </Link>
            <Link
              to="/business/register"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full text-center py-2.5 font-bold text-sm rounded-xl transition-colors ${!isLogin ? "bg-[#10b981] text-white" : "border border-slate-800 text-slate-300 hover:bg-slate-800"}`}
            >
              Business Sign Up
            </Link>
          </div>
        )}
      </header>
      <main className="flex-1">
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="bg-[#050b18] border-t border-white/5 py-8 px-8 flex flex-col shrink-0">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
          <div className="flex justify-center items-center gap-2 text-slate-400 text-sm font-semibold select-none pb-4 border-b border-white/5">
            <div className="w-5 h-5 bg-[#10b981]/15 rounded-full flex items-center justify-center text-[#10b981] shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <span>Your data is secure and never shared.</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/"
              className="text-[#10b981] hover:text-[#0da662] text-[13.5px] font-black transition-colors"
            >
              &larr; Back to Public Website
            </Link>
            <div className="text-[12.5px] text-slate-400 font-semibold">
              &copy; {new Date().getFullYear()} FB Page Review Business. All
              rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    fetch("/api/public-settings")
      .then((res) => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return {};
      })
      .then((data: any) => {
        if (data.site_logo) {
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = data.site_logo;
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Router>
      <VisitTracker />
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          <Route element={<StandardLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/review-guidelines" element={<ReviewGuidelines />} />
            <Route path="/how-reviews-work" element={<HowReviewsWork />} />
            <Route path="/dispute-policy" element={<DisputePolicy />} />
            <Route
              path="/content-removal-policy"
              element={<ContentRemovalPolicy />}
            />
            <Route path="/search" element={<GlobalSearch />} />
            <Route path="/fraud-pages" element={<FraudDirectory />} />

            {/* Redirects for old categories routes */}
            <Route path="/categories" element={<Navigate to="/" replace />} />
            <Route
              path="/category/:categorySlug"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/category/:categorySlug/:subcategorySlug"
              element={<Navigate to="/" replace />}
            />

            <Route path="/page/:id" element={<PageProfile />} />
            <Route path="/write-review" element={<WriteReview />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Business Public Routes */}
          <Route path="/business" element={<BusinessPublicLayout />}>
            <Route index element={<Navigate to="/business/login" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
          </Route>

          <Route
            path="/tufayel"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="reviews/:id" element={<AdminReviewDetails />} />
            <Route path="pages" element={<AdminPages />} />
            <Route path="pages/:id" element={<AdminPageDetails />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="contact-numbers" element={<AdminContactNumbers />} />
            <Route
              path="contact-numbers/:id"
              element={<AdminContactNumberDetails />}
            />
            <Route path="page-claims" element={<AdminPageClaims />} />
            <Route path="page-claims/:id" element={<AdminPageClaimDetails />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="disputes/:id" element={<AdminDisputeDetails />} />

            <Route path="blog-posts" element={<AdminBlogPosts />} />
            <Route path="blog-posts/:id" element={<AdminBlogPostDetails />} />
            <Route path="media-library" element={<AdminMediaLibrary />} />
            <Route path="reports-abuse" element={<AdminAbuseReports />} />
            <Route
              path="reports-abuse/:id"
              element={<AdminAbuseReportDetails />}
            />
            <Route path="bulk-import" element={<AdminBulkImport />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="messages/:id" element={<AdminMessageDetails />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="logs" element={<AdminLogs />} />
          </Route>

          <Route
            path="/business-dashboard"
            element={
              <BusinessOwnerRoute>
                <BusinessLayout />
              </BusinessOwnerRoute>
            }
          >
            <Route index element={<BusinessOverview />} />
            <Route path="pages" element={<BusinessPages />} />
            <Route path="reviews" element={<BusinessReviews />} />
            <Route path="profile-info" element={<BusinessProfileInfo />} />
            <Route
              path="contact-numbers"
              element={<BusinessContactNumbers />}
            />
            <Route path="settings" element={<BusinessSettings />} />
          </Route>
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
