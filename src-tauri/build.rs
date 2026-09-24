fn main() {
    // The exe embeds icons/icon.ico at build time; without this line a
    // changed icon is not picked up until the build cache is cleared.
    println!("cargo:rerun-if-changed=icons");
    tauri_build::build()
}
