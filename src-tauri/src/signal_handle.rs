use crate::TranscriptionCoordinator;
#[cfg(unix)]
use log::debug;
use log::warn;
use tauri::{AppHandle, Manager};

#[cfg(unix)]
use signal_hook::consts::SIGUSR2;
#[cfg(unix)]
use signal_hook::iterator::Signals;
#[cfg(unix)]
use std::thread;

/// Send a transcription input to the coordinator.
/// Used by signal handlers, CLI flags, and any other external trigger.
pub fn send_transcription_input(app: &AppHandle, binding_id: &str, source: &str) {
    if let Some(c) = app.try_state::<TranscriptionCoordinator>() {
        c.send_external_input(binding_id, source);
    } else {
        warn!("TranscriptionCoordinator not initialized");
    }
}

/// Listen for the Unix signal that remotely toggles transcription.
///
/// Only SIGUSR2 is handled. SIGUSR1 must stay untouched on Linux: WebKitGTK's
/// JavaScriptCore garbage collector sends it to its own threads to suspend
/// them, so handling it caused phantom recordings on every GC cycle (#1660).
#[cfg(unix)]
pub fn setup_signal_handler(app_handle: AppHandle) {
    let mut signals =
        Signals::new([SIGUSR2]).expect("failed to register transcription signal handler");
    debug!("Signal handler registered (SIGUSR2; SIGUSR1 is left to WebKitGTK)");
    thread::spawn(move || {
        for sig in signals.forever() {
            if sig != SIGUSR2 {
                continue;
            }
            debug!("Received SIGUSR2");
            send_transcription_input(&app_handle, "transcribe", "SIGUSR2");
        }
    });
}
