//! The model check of one pane: each new answer is judged once, against the
//! model selected when it arrived, so switching models later does not turn
//! an earlier answer into a mismatch. The selection comes from Heron's
//! hooks (SessionStart, PostModelSwitch); while they do not know it (a
//! resumed session), from the heron-limits status line. The answers come
//! from the transcript. Pure.

use serde::Serialize;

use super::answers::same_model;

/// What the frontend shows. `pending` until there is an answer judged
/// against the current selection.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Verdict {
    pub state: &'static str,
    pub selected: Option<String>,
    pub actual: Option<String>,
}

#[derive(Default)]
pub struct ModelCheck {
    /// What the hooks reported; None when they do not know.
    hooks: Option<String>,
    /// What the status line of the current transcript's session reported.
    status_line: Option<String>,
    last: Option<Judged>,
}

/// The latest answer, and the model selected when it arrived.
struct Judged {
    actual: String,
    selected: Option<String>,
}

impl ModelCheck {
    /// The hooks told the session's model, or that it is unknown.
    pub fn select(&mut self, model: Option<&str>) {
        self.hooks = model.map(str::to_owned);
    }

    /// The model the status line shows, used while the hooks do not know one.
    pub fn select_from_status_line(&mut self, model: &str) {
        self.status_line = Some(model.to_owned());
    }

    /// A new transcript (a new session, or /clear): no answer yet, and the
    /// status line has not spoken for it.
    pub fn restart(&mut self) {
        self.last = None;
        self.status_line = None;
    }

    pub fn answered(&mut self, model: &str) {
        self.last = Some(Judged { actual: model.to_owned(), selected: self.selected().cloned() });
    }

    pub fn verdict(&self) -> Verdict {
        let selected = self.selected().cloned();
        let actual = self.last.as_ref().map(|j| j.actual.clone());
        let state = match (&self.last, &selected) {
            (Some(last), Some(now)) if same_model(&last.actual, now) => "ok",
            // Judged against what is still selected: a real mismatch. After
            // a switch, wait for the next answer instead.
            (Some(last), Some(now)) if last.selected.as_deref().is_some_and(|then| same_model(then, now)) => "mismatch",
            _ => "pending",
        };
        Verdict { state, selected, actual }
    }

    fn selected(&self) -> Option<&String> {
        self.hooks.as_ref().or(self.status_line.as_ref())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const OPUS: &str = "claude-opus-5-5";
    const SONNET: &str = "claude-sonnet-5-5";

    #[test]
    fn judges_each_answer_against_the_selection_it_came_with() {
        let mut check = ModelCheck::default();
        assert_eq!(check.verdict().state, "pending");
        check.select(Some(OPUS));
        check.answered("claude-opus-5-5[1m]");
        assert_eq!(check.verdict().state, "ok");
        check.answered(SONNET);
        let verdict = check.verdict();
        assert_eq!((verdict.state, verdict.selected.as_deref(), verdict.actual.as_deref()), ("mismatch", Some(OPUS), Some(SONNET)));
    }

    #[test]
    fn a_switch_after_an_answer_waits_for_the_next_one() {
        let mut check = ModelCheck::default();
        check.select(Some(OPUS));
        check.answered(OPUS);
        check.select(Some(SONNET));
        assert_eq!(check.verdict().state, "pending");
        check.answered(SONNET);
        assert_eq!(check.verdict().state, "ok");
    }

    #[test]
    fn answers_without_a_known_selection_stay_pending() {
        let mut check = ModelCheck::default();
        check.answered(SONNET);
        assert_eq!(check.verdict().state, "pending");
        check.select(Some(OPUS));
        assert_eq!(check.verdict().state, "pending");
        check.answered(SONNET);
        assert_eq!(check.verdict().state, "mismatch");
        check.restart();
        assert_eq!(check.verdict().state, "pending");
    }

    #[test]
    fn the_status_line_speaks_only_while_the_hooks_do_not_know() {
        let mut check = ModelCheck::default();
        // A resumed session: the hooks say the model is unknown.
        check.select(None);
        check.select_from_status_line(SONNET);
        check.answered(OPUS);
        assert_eq!(check.verdict().state, "mismatch");
        check.select(Some(OPUS));
        check.answered(OPUS);
        assert_eq!(check.verdict().state, "ok", "the hooks win once they know");
        // A new session in the pane does not inherit the old status line.
        check.select(None);
        check.restart();
        check.answered(OPUS);
        assert_eq!(check.verdict().state, "pending");
    }
}
