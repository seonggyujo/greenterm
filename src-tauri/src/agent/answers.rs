//! Answers in a Claude Code transcript (one JSON entry per line): which
//! model wrote each answer of the main conversation. Pure: parsing and
//! comparing only.

use serde_json::Value;

use crate::claude_version::{self, Version};

/// Claude Code tells hooks about model switches (PostModelSwitch) since this
/// version. Answers an older one wrote are not judged: after /model they
/// would look like mismatches.
const MODEL_SWITCH_HOOK: Version = (2, 1, 251);

/// One answer of the main conversation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Answer {
    /// `message.id`. One answer is written as several lines (thinking, text,
    /// tool calls) that share it.
    pub id: Option<String>,
    pub model: String,
    /// When it was written, in ms since the Unix epoch.
    pub at: Option<u64>,
}

/// The answer on one transcript line, or None for anything else. Subagent
/// entries (`isSidechain`) are skipped because subagents may use other
/// models on purpose, and so are `<synthetic>` placeholders written on
/// interruptions and errors, and answers of a Claude Code older than
/// MODEL_SWITCH_HOOK.
pub fn answer_of(line: &str) -> Option<Answer> {
    if !line.contains("\"assistant\"") {
        return None;
    }
    let entry: Value = serde_json::from_str(line).ok()?;
    if entry.get("type")?.as_str()? != "assistant" || entry.get("isSidechain").and_then(Value::as_bool) == Some(true) {
        return None;
    }
    let written_by = entry.get("version").and_then(Value::as_str).and_then(claude_version::parse);
    if written_by.is_some_and(|v| v < MODEL_SWITCH_HOOK) {
        return None;
    }
    let message = entry.get("message")?;
    let model = message.get("model")?.as_str().filter(|m| !m.is_empty() && *m != "<synthetic>")?;
    Some(Answer {
        id: message.get("id").or_else(|| entry.get("uuid")).and_then(Value::as_str).map(str::to_owned),
        model: model.to_owned(),
        at: entry.get("timestamp").and_then(Value::as_str).and_then(iso_millis),
    })
}

/// Same model, ignoring a suffix such as `[1m]` and a date such as
/// `-20251001`.
pub fn same_model(a: &str, b: &str) -> bool {
    base_model(a) == base_model(b)
}

fn base_model(id: &str) -> String {
    let id = match id.find('[') {
        Some(i) if id.ends_with(']') => &id[..i],
        _ => id,
    };
    let id = match id.rsplit_once('-') {
        Some((head, date)) if date.len() == 8 && date.bytes().all(|b| b.is_ascii_digit()) => head,
        _ => id,
    };
    id.to_ascii_lowercase()
}

/// "2026-10-10T05:09:03.787Z" in ms since the Unix epoch: the UTC form
/// Claude Code writes. None for anything else.
fn iso_millis(ts: &str) -> Option<u64> {
    let b = ts.as_bytes();
    let shape = b.len() >= 20 && b[4] == b'-' && b[7] == b'-' && b[10] == b'T' && b[13] == b':' && b[16] == b':';
    if !shape || !ts.ends_with('Z') {
        return None;
    }
    let num = |from: usize, to: usize| ts.get(from..to)?.parse::<u64>().ok();
    let (year, month, day) = (num(0, 4)?, num(5, 7)?, num(8, 10)?);
    let seconds = num(11, 13)? * 3600 + num(14, 16)? * 60 + num(17, 19)?;
    let millis = match &ts[19..ts.len() - 1] {
        "" => 0,
        fraction => {
            let digits = fraction.strip_prefix('.')?;
            let ms = format!("{:0<3}", digits.get(..3.min(digits.len()))?);
            ms.parse::<u64>().ok()?
        }
    };
    let days = u64::try_from(days_from_civil(year, month, day)).ok()?;
    Some((days * 86_400 + seconds) * 1000 + millis)
}

/// Days since 1970-01-01 (Howard Hinnant's algorithm).
fn days_from_civil(year: u64, month: u64, day: u64) -> i64 {
    let (year, month, day) = (year as i64 - i64::from(month <= 2), month as i64, day as i64);
    let era = year.div_euclid(400);
    let year_of_era = year - era * 400;
    let day_of_year = (153 * (month + if month > 2 { -3 } else { 9 }) + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(extra: &str) -> String {
        format!(
            r#"{{"type":"assistant","isSidechain":false,"timestamp":"2026-10-10T00:18:30.302Z",{extra}"message":{{"id":"msg_1","model":"claude-opus-5-5"}}}}"#
        )
    }

    #[test]
    fn reads_the_answer_of_the_main_conversation() {
        let answer = answer_of(&line("")).unwrap();
        assert_eq!(answer.id.as_deref(), Some("msg_1"));
        assert_eq!(answer.model, "claude-opus-5-5");
        assert_eq!(answer.at, Some(1_791_591_510_302));
    }

    #[test]
    fn skips_subagents_placeholders_and_other_entries() {
        assert_eq!(answer_of(&line(r#""isSidechain":true,"#)), None);
        assert_eq!(answer_of(&line("").replace("claude-opus-5-5", "<synthetic>")), None);
        assert_eq!(answer_of(r#"{"type":"user","message":{"content":"assistant"}}"#), None);
        assert_eq!(answer_of(r#"{"type":"assistant","#), None);
    }

    #[test]
    fn skips_answers_of_a_claude_code_that_cannot_report_model_switches() {
        assert_eq!(answer_of(&line(r#""version":"2.1.250","#)), None);
        assert!(answer_of(&line(r#""version":"2.1.251","#)).is_some());
    }

    #[test]
    fn compares_models_without_suffixes() {
        assert!(same_model("claude-opus-5-5[1m]", "claude-opus-5-5"));
        assert!(same_model("claude-haiku-4-5-20251001", "Claude-Haiku-4-5"));
        assert!(!same_model("claude-sonnet-5-5", "claude-opus-5-5"));
    }

    #[test]
    fn reads_utc_timestamps_only() {
        assert_eq!(iso_millis("1970-01-01T00:00:00Z"), Some(0));
        assert_eq!(iso_millis("2000-03-01T00:00:01.5Z"), Some(951_868_801_500));
        assert_eq!(iso_millis("2026-10-10T00:18:30+09:00"), None);
        assert_eq!(iso_millis("yesterday"), None);
    }
}
