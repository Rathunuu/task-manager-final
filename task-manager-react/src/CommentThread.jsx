import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { logoutUser } from "./auth";

// The comment thread of ONE task. Rendered inside the task detail dialog.
// The server only returns comments to members of the task's project.
function CommentThread({ taskId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // 401 = login expired -> clear login and go back to the login screen
  function handleError(err, fallback) {
    if (err && err.status === 401) {
      logoutUser();
      window.location.reload();
      return;
    }

    setError(err?.message || fallback);
  }

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    apiRequest(`/tasks/${taskId}/comments`)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setComments([]);
          handleError(err, "Failed to load comments");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!text.trim() || sending) return;

    setSending(true);
    setError("");

    try {
      const data = await apiRequest(`/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text: text.trim() }),
      });

      setComments((current) => [...current, data.comment]);
      setText("");
    } catch (err) {
      handleError(err, "Failed to post comment");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-6" aria-labelledby={`comments-heading-${taskId}`}>
      <h3
        id={`comments-heading-${taskId}`}
        className="text-sm font-bold text-slate-700 mb-2"
      >
        Comments ({comments.length})
      </h3>

      {loading && <p className="text-sm text-slate-600">Loading comments...</p>}

      {!loading && comments.length === 0 && !error && (
        <p className="text-sm text-slate-600">No comments yet.</p>
      )}

      <ul className="space-y-2 mb-3 max-h-56 overflow-y-auto">
        {comments.map((comment) => (
          <li
            key={comment._id}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
          >
            <p className="text-xs text-slate-600">
              <strong className="text-slate-800">
                {comment.author?.name || "Unknown"}
              </strong>{" "}
              · {new Date(comment.createdAt).toLocaleString()}
            </p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap break-words mt-1">
              {comment.text}
            </p>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor={`comment-input-${taskId}`} className="sr-only">
          Write a comment
        </label>
        <input
          id={`comment-input-${taskId}`}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          maxLength={2000}
          className="flex-1 p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold"
        >
          {sending ? "Posting..." : "Post"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-700 mt-2">
          {error}
        </p>
      )}
    </section>
  );
}

export default CommentThread;
