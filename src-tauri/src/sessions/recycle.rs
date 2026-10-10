//! Moves files and folders to the Recycle Bin (`SHFileOperationW` with
//! undo allowed), so a deleted session can be brought back. No dialog and
//! no progress window.

use std::ffi::c_void;
use std::io;
use std::os::windows::ffi::OsStrExt;
use std::path::PathBuf;

const FO_DELETE: u32 = 3;
const FOF_SILENT: u16 = 0x4;
const FOF_NOCONFIRMATION: u16 = 0x10;
const FOF_ALLOWUNDO: u16 = 0x40;
const FOF_NOERRORUI: u16 = 0x400;

#[repr(C)]
struct ShFileOp {
    hwnd: *mut c_void,
    func: u32,
    from: *const u16,
    to: *const u16,
    flags: u16,
    any_aborted: i32,
    name_mappings: *mut c_void,
    progress_title: *const u16,
}

#[link(name = "shell32")]
extern "system" {
    fn SHFileOperationW(op: *mut ShFileOp) -> i32;
}

pub fn to_recycle_bin(paths: &[PathBuf]) -> io::Result<()> {
    // One list of paths, each ending in a NUL, the list ending in another.
    let mut from: Vec<u16> = Vec::new();
    for path in paths {
        from.extend(path.as_os_str().encode_wide());
        from.push(0);
    }
    from.push(0);
    let mut op = ShFileOp {
        hwnd: std::ptr::null_mut(),
        func: FO_DELETE,
        from: from.as_ptr(),
        to: std::ptr::null(),
        flags: FOF_SILENT | FOF_NOCONFIRMATION | FOF_ALLOWUNDO | FOF_NOERRORUI,
        any_aborted: 0,
        name_mappings: std::ptr::null_mut(),
        progress_title: std::ptr::null(),
    };
    // SAFETY: `from` is double-NUL terminated and outlives the call.
    let code = unsafe { SHFileOperationW(&mut op) };
    if code != 0 || op.any_aborted != 0 {
        return Err(io::Error::other(format!("SHFileOperationW failed with {code:#x}")));
    }
    Ok(())
}
