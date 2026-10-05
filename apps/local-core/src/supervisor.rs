use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub name: String,
    pub port: u16,
    pub health_url: String,
    pub command: String,
    pub args: Vec<String>,
    pub working_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub name: String,
    pub port: u16,
    pub pid: Option<u32>,
    pub status: String,
    pub healthy: bool,
    pub restarts: u32,
}

struct ManagedChild {
    config: ServiceConfig,
    child: Option<Child>,
    restarts: u32,
    status: String,
    healthy: bool,
}

#[derive(Clone)]
pub struct ProcessSupervisor {
    root_dir: PathBuf,
    services: Arc<Mutex<HashMap<String, ManagedChild>>>,
    is_running: Arc<Mutex<bool>>,
}

impl ProcessSupervisor {
    pub fn new(root_dir: PathBuf) -> Self {
        let supervisor = Self {
            root_dir,
            services: Arc::new(Mutex::new(HashMap::new())),
            is_running: Arc::new(Mutex::new(false)),
        };

        supervisor.register_default_services();
        supervisor
    }

    fn register_default_services(&self) {
        let mut services = self.services.lock().unwrap();

        let defaults = vec![
            ServiceConfig {
                name: "orchestrator".to_string(),
                port: 4100,
                health_url: "http://127.0.0.1:4100/.well-known/agent.json".to_string(),
                command: "npx".to_string(),
                args: vec!["pnpm".to_string(), "--filter".to_string(), "orchestrator".to_string(), "dev".to_string()],
                working_dir: "apps/orchestrator".to_string(),
            },
            ServiceConfig {
                name: "agent-worker".to_string(),
                port: 4200,
                health_url: "http://127.0.0.1:4200/.well-known/agent.json".to_string(),
                command: "npx".to_string(),
                args: vec!["pnpm".to_string(), "--filter".to_string(), "agent-worker".to_string(), "dev".to_string()],
                working_dir: "apps/agent-worker".to_string(),
            },
            ServiceConfig {
                name: "gateway".to_string(),
                port: 4000,
                health_url: "http://127.0.0.1:4000/health".to_string(),
                command: "npx".to_string(),
                args: vec!["pnpm".to_string(), "--filter".to_string(), "gateway".to_string(), "dev".to_string()],
                working_dir: "apps/gateway".to_string(),
            },
        ];

        for cfg in defaults {
            services.insert(
                cfg.name.clone(),
                ManagedChild {
                    config: cfg,
                    child: None,
                    restarts: 0,
                    status: "stopped".to_string(),
                    healthy: false,
                },
            );
        }
    }

    pub fn start_all(&self) {
        let mut running = self.is_running.lock().unwrap();
        if *running {
            return;
        }
        *running = true;
        drop(running);

        println!("[Local Core Supervisor] Starting background process supervisor...");

        let self_clone = self.clone();
        thread::spawn(move || {
            self_clone.supervisor_loop();
        });
    }

    fn supervisor_loop(&self) {
        while *self.is_running.lock().unwrap() {
            let names: Vec<String> = {
                let services = self.services.lock().unwrap();
                services.keys().cloned().collect()
            };

            for name in names {
                self.ensure_service_running(&name);
                self.check_service_health(&name);
            }

            thread::sleep(Duration::from_secs(3));
        }
    }

    fn ensure_service_running(&self, name: &str) {
        let mut services = self.services.lock().unwrap();
        if let Some(managed) = services.get_mut(name) {
            let mut needs_spawn = false;

            if let Some(ref mut child) = managed.child {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        println!(
                            "[Local Core Supervisor] Service '{}' exited with status: {}",
                            name, status
                        );
                        managed.status = "crashed".to_string();
                        managed.healthy = false;
                        managed.child = None;
                        managed.restarts += 1;
                        needs_spawn = true;
                    }
                    Ok(None) => {
                        managed.status = "running".to_string();
                    }
                    Err(e) => {
                        println!("[Local Core Supervisor] Error checking '{}': {}", name, e);
                    }
                }
            } else {
                needs_spawn = true;
            }

            if needs_spawn {
                println!(
                    "[Local Core Supervisor] Spawning service '{}' (Attempt {})...",
                    name, managed.restarts + 1
                );
                managed.status = "starting".to_string();

                let mut cmd = Command::new(&managed.config.command);
                cmd.args(&managed.config.args);
                cmd.current_dir(&self.root_dir);
                cmd.stdout(Stdio::inherit());
                cmd.stderr(Stdio::inherit());

                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::process::CommandExt;
                    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                }

                match cmd.spawn() {
                    Ok(child) => {
                        println!(
                            "[Local Core Supervisor] Service '{}' spawned with PID: {}",
                            name,
                            child.id()
                        );
                        managed.child = Some(child);
                        managed.status = "running".to_string();
                    }
                    Err(err) => {
                        println!(
                            "[Local Core Supervisor] Failed to spawn service '{}': {}",
                            name, err
                        );
                        managed.status = "crashed".to_string();
                    }
                }
            }
        }
    }

    fn check_service_health(&self, name: &str) {
        let url = {
            let services = self.services.lock().unwrap();
            services.get(name).map(|s| s.config.health_url.clone())
        };

        if let Some(health_url) = url {
            let client = reqwest::blocking::Client::builder()
                .timeout(Duration::from_secs(2))
                .build();

            let healthy = match client {
                Ok(c) => match c.get(&health_url).send() {
                    Ok(resp) => resp.status().is_success(),
                    Err(_) => false,
                },
                Err(_) => false,
            };

            let mut services = self.services.lock().unwrap();
            if let Some(managed) = services.get_mut(name) {
                managed.healthy = healthy;
            }
        }
    }

    pub fn get_status(&self) -> Vec<ServiceStatus> {
        let services = self.services.lock().unwrap();
        services
            .values()
            .map(|managed| ServiceStatus {
                name: managed.config.name.clone(),
                port: managed.config.port,
                pid: managed.child.as_ref().map(|c| c.id()),
                status: managed.status.clone(),
                healthy: managed.healthy,
                restarts: managed.restarts,
            })
            .collect()
    }

    pub fn stop_all(&self) {
        println!("[Local Core Supervisor] Gracefully shutting down all child services...");
        let mut running = self.is_running.lock().unwrap();
        *running = false;

        let mut services = self.services.lock().unwrap();
        for (name, managed) in services.iter_mut() {
            if let Some(mut child) = managed.child.take() {
                println!("[Local Core Supervisor] Terminating process '{}' (PID: {})...", name, child.id());
                let _ = child.kill();
                let _ = child.wait();
            }
            managed.status = "stopped".to_string();
            managed.healthy = false;
        }
    }
}
