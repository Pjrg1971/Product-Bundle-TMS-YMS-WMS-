/**
 * Middleware that publishes events after YMS operations
 * Wraps route handlers to emit integration events
 */

function withGateCheckinEvent(originalHandler) {
  return async (req, res) => {
    await originalHandler(req, res);
    // After successful gate check-in, the trigger in 005_event_functions.sql
    // will automatically fire the NOTIFY via the database trigger
    // No additional code needed here - the DB trigger handles it
  };
}

function withDockAssignEvent(originalHandler) {
  return async (req, res) => {
    await originalHandler(req, res);
    // DB trigger handles NOTIFY automatically
  };
}

module.exports = { withGateCheckinEvent, withDockAssignEvent };
