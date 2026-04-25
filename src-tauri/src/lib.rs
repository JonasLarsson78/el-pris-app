use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use image::ImageReader;
                use std::io::Cursor;

                let bytes = include_bytes!("../icons/icon.png");
                let img = ImageReader::new(Cursor::new(bytes))
                    .with_guessed_format()
                    .unwrap()
                    .decode()
                    .unwrap();
                let rgba = img.to_rgba8();
                let (width, height) = rgba.dimensions();
                let icon = tauri::image::Image::new_owned(rgba.into_raw(), width, height);

                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
