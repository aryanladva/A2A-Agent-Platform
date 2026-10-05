// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use local_core::{ProcessSupervisor, ServiceStatus};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

struct SupervisorState {
    supervisor: Mutex<Option<ProcessSupervisor>>,
}

#[tauri::command]
fn get_services_status(state: State<'_, SupervisorState>) -> Vec<ServiceStatus> {
    if let Some(ref supervisor) = *state.supervisor.lock().unwrap() {
        supervisor.get_status()
    } else {
        vec![]
    }
}

fn main() {
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    // Navigate to monorepo root if running from apps/desktop-shell
    let root_dir = if current_dir.ends_with("apps/desktop-shell") || current_dir.ends_with("apps\\desktop-shell") {
        current_dir.parent().unwrap().parent().unwrap().to_path_buf()
    } else {
        current_dir
    };

    println!("[Desktop Shell] Initializing Process Supervisor at root: {:?}", root_dir);
    let supervisor = ProcessSupervisor::new(root_dir);
    supervisor.start_all();

    let supervisor_for_cleanup = supervisor.clone();

    tauri::Builder::default()
        .manage(SupervisorState {
            supervisor: Mutex::new(Some(supervisor)),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_services_status])
        .on_window_event(move |_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                supervisor_for_cleanup.stop_all();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
