import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "./api";
import { logoutUser } from "./auth";

const REFRESH_MS = 60000;

// The notification bell: unread count on the icon, and a dropdown with the
// most recent notifications. New ones are picked up every minute.
//
// props:
//   onOpenNotification  called with (projectId, taskId) when a notification
//                       that points at a task is clicked
function NotificationBell({ onOpenNotification }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const wrapperRef = useRef(null);

  // 401 = login expired -> clear login and go back to the login screen
  const handleError = useCallback((err, fallback) => {
    if (err && err.status === 401) {
      logoutUser();
      window.location.reload();
      return;
    }

    setError(err?.message || fallback);
  }, []);

  const load = useCallback(() => {
    apiRequest("/notifications")
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setError("");
      })
      .catch((err) => handleError(err, "Could not load notifications"));
  }, [handleError]);

  useEffect(() => {
    load();

    const timer = setInterval(load, REFRESH_MS);

    return () => clearInterval(timer);
  }, [load]);

  // Close the dropdown with Escape or by clicking outside it
  useEffect(() => {
    if (!open) return;

    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  function toggle() {
    const next = !open;

    setOpen(next);

    if (next) load();
  }

  async function handleOpenNotification(notification) {
    if (!notification.read) {
      try {
        await apiRequest(`/notifications/${notification._id}/read`, {
          method: "PATCH",
        });

        setNotifications((current) =>
          current.map((n) =>
            n._id === notification._id ? { ...n, read: true } : n
          )
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (err) {
        handleError(err, "Could not update notification");
      }
    }

    if (notification.task && onOpenNotification) {
      setOpen(false);
      onOpenNotification(notification.project, notification.task);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });

      setNotifications((current) =>
        current.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      handleError(err, "Could not update notifications");
    }
  }

  const label =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications, none unread";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls="notification-dropdown"
        className="relative h-10 w-10 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-blue-400 transition"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-dropdown"
          role="region"
          aria-label="Recent notifications"
          className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800">Notifications</h2>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-blue-700 hover:underline disabled:text-slate-500 disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>

          {error && (
            <p role="alert" className="px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {notifications.length === 0 && !error && (
            <p className="px-4 py-6 text-sm text-slate-600 text-center">
              You have no notifications yet.
            </p>
          )}

          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification._id} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                    notification.read ? "" : "bg-blue-50"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!notification.read && (
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                      />
                    )}
                    <span className="block">
                      {!notification.read && (
                        <span className="sr-only">Unread: </span>
                      )}
                      <span
                        className={`block text-sm text-slate-800 ${
                          notification.read ? "" : "font-semibold"
                        }`}
                      >
                        {notification.message}
                      </span>
                      <span className="block text-xs text-slate-600 mt-0.5">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
