// Sanchikakrmik - Intelligent High-Performance Storage Organizer
// Developed by ANOOP KUMAR (240Hz Ultra-Smooth Mode Active)

let storageRoot = "/storage/emulated/0";
let hasPermission = false;

let currentSourcePath = "";
let isSorting = false;
let isDryRun = false;

// Active Category Definitions with Recommended Default Destination Subfolders
const defaultCategories = {
    'Images': { icon: '🖼️', color: '#ff7675', defaultSubdir: 'Pictures', count: 0 },
    'Documents': { icon: '📄', color: '#74b9ff', defaultSubdir: 'Documents', count: 0 },
    'Videos': { icon: '🎬', color: '#a29bfe', defaultSubdir: 'Movies', count: 0 },
    'Audio': { icon: '🎵', color: '#ffeaa7', defaultSubdir: 'Music', count: 0 },
    'Archives': { icon: '📦', color: '#fdcb6e', defaultSubdir: 'Archives', count: 0 },
    'Data_Spreadsheets': { icon: '📊', color: '#55efc4', defaultSubdir: 'Documents/Spreadsheets', count: 0 },
    'APKs_Apps': { icon: '📱', color: '#00cec9', defaultSubdir: 'Download/APKs', count: 0 },
    'Code_Dev': { icon: '💻', color: '#e17055', defaultSubdir: 'Documents/Code', count: 0 },
    'Misc': { icon: '📁', color: '#b2bec3', defaultSubdir: 'Organized_Misc', count: 0 }
};

// Map: Category Key -> User's Selected Destination Folder Path
let categoryDestinations = {};

// Folder Picker Modal State
let pickerTargetType = null; // 'source' or 'category'
let pickerCategoryKey = null; // e.g. 'Images', 'Audio'
let pickerCurrentPath = "";
let pickerParentPath = "";

// DOM Elements
const permBanner = document.getElementById('permBanner');
const sourcePathEl = document.getElementById('sourceFolderPath');
const totalFilesEl = document.getElementById('totalFilesCount');
const totalSizeEl = document.getElementById('totalSizeText');
const categoriesContainer = document.getElementById('categoriesContainer');

const progressCard = document.getElementById('progressCard');
const progressBar = document.getElementById('progressBarFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const progressFile = document.getElementById('progressFile');

const sortBtn = document.getElementById('btnStartSort');
const scanBtn = document.getElementById('btnScan');
const undoBtn = document.getElementById('btnUndo');
const toastEl = document.getElementById('toast');

// Modal Elements
const folderModal = document.getElementById('folderPickerModal');
const modalTitle = document.getElementById('modalTitle');
const breadcrumbPathText = document.getElementById('breadcrumbPathText');
const modalFolderList = document.getElementById('modalFolderList');
const btnUpDir = document.getElementById('btnUpDir');

// Initialize Category Destinations with Root + Default Subdirectories
function initCategoryDestinations(baseRoot) {
    const root = baseRoot || storageRoot;
    for (let cat in defaultCategories) {
        if (!categoryDestinations[cat]) {
            categoryDestinations[cat] = `${root}/${defaultCategories[cat].defaultSubdir}`;
        }
    }
}
initCategoryDestinations(storageRoot);

// Render Category Cards (Option to choose folder placed directly underneath each category!)
function renderCategories() {
    categoriesContainer.innerHTML = '';
    for (let [cat, data] of Object.entries(defaultCategories)) {
        const destPath = categoryDestinations[cat] || 'Not chosen yet';
        const card = document.createElement('div');
        card.className = 'category-card';
        card.style.borderColor = data.count > 0 ? data.color : '#233149';

        card.innerHTML = `
            <div class="category-card-top">
                <div class="category-title-wrap">
                    <span class="cat-icon-badge">${data.icon}</span>
                    <span class="cat-title-name">${cat.replace('_', ' ')}</span>
                </div>
                <span class="cat-files-badge" style="color: ${data.color};">
                    ${data.count} files
                </span>
            </div>

            <!-- Destination Folder Underneath Each Category -->
            <div class="category-card-dest-box">
                <div class="cat-dest-label-row">
                    <span class="cat-dest-label">Destination Folder for ${cat.replace('_', ' ')}:</span>
                </div>
                <div class="cat-dest-path-text ${!categoryDestinations[cat] ? 'empty' : ''}" title="${destPath}">
                    📁 ${destPath}
                </div>
                <div class="cat-dest-actions">
                    <button class="btn-cat-choose-folder" onclick="openFolderPicker('category', '${cat}')">
                        <span>📂</span>
                        <span>Choose Folder for ${cat.replace('_', ' ')}</span>
                    </button>
                    <button class="btn-cat-reset-dest" onclick="resetSingleCategoryDest('${cat}')" title="Reset folder">
                        <span>↺</span>
                    </button>
                </div>
            </div>
        `;
        categoriesContainer.appendChild(card);
    }
}
renderCategories();

function resetSingleCategoryDest(cat) {
    categoryDestinations[cat] = `${storageRoot}/${defaultCategories[cat].defaultSubdir}`;
    renderCategories();
    showToast(`Reset destination for ${cat}`);
}

function resetAllCategoryDestinations() {
    for (let cat in defaultCategories) {
        categoryDestinations[cat] = `${storageRoot}/${defaultCategories[cat].defaultSubdir}`;
    }
    renderCategories();
    showToast("All category destination folders reset to defaults!");
}

// Android Permission Status Callback
window.onPermissionStatusChanged = function(granted, defaultRoot) {
    hasPermission = granted;
    if (defaultRoot && defaultRoot.length > 0) {
        storageRoot = defaultRoot;
    }

    if (granted) {
        permBanner.style.display = 'none';
        if (!currentSourcePath) {
            // Default to Download folder
            const defaultDownload = `${storageRoot}/Download`;
            setSourcePath(defaultDownload);
        }
    } else {
        permBanner.style.display = 'flex';
    }
};

function requestStoragePermission() {
    if (window.AndroidBridge && window.AndroidBridge.requestPermission) {
        window.AndroidBridge.requestPermission();
    } else {
        window.onPermissionStatusChanged(true, "/storage/emulated/0");
        showToast("Demo: Permission Granted!");
    }
}

function setSourcePath(path) {
    currentSourcePath = path;
    sourcePathEl.innerText = path;
    sourcePathEl.style.color = '#38bdf8';
    startScan();
}

// IN-APP FOLDER PICKER MODAL (Bypasses Android SAF Privacy Restrictions)
function openFolderPicker(targetType, categoryKey = null) {
    pickerTargetType = targetType;
    pickerCategoryKey = categoryKey;

    if (targetType === 'source') {
        modalTitle.innerText = "Select Source Folder (Files to Sort)";
        pickerCurrentPath = currentSourcePath || `${storageRoot}/Download`;
    } else {
        modalTitle.innerText = `Select Destination for ${categoryKey.replace('_', ' ')}`;
        pickerCurrentPath = categoryDestinations[categoryKey] || storageRoot;
    }

    folderModal.style.display = 'flex';
    loadFolderList(pickerCurrentPath);
}

function closeFolderPicker() {
    folderModal.style.display = 'none';
}

function loadFolderList(path) {
    breadcrumbPathText.innerText = path;
    modalFolderList.innerHTML = '<div class="loading-folders">Loading folders...</div>';

    if (window.AndroidBridge && window.AndroidBridge.listFolders) {
        try {
            const raw = window.AndroidBridge.listFolders(path);
            const data = JSON.parse(raw);

            if (data.error) {
                // Try parent if path doesn't exist
                if (data.parentPath) {
                    loadFolderList(data.parentPath);
                    return;
                }
                modalFolderList.innerHTML = `<div class="empty-folders">⚠️ ${data.error}</div>`;
                return;
            }

            pickerCurrentPath = data.currentPath || path;
            pickerParentPath = data.parentPath || "";
            breadcrumbPathText.innerText = pickerCurrentPath;

            btnUpDir.disabled = !pickerParentPath;
            btnUpDir.style.opacity = pickerParentPath ? "1" : "0.4";

            renderFolderItems(data.folders || []);
        } catch (e) {
            modalFolderList.innerHTML = `<div class="empty-folders">Error: ${e.message}</div>`;
        }
    } else {
        // Desktop Browser Demo Simulation
        simulateFolderList(path);
    }
}

function renderFolderItems(folders) {
    modalFolderList.innerHTML = '';
    if (!folders || folders.length === 0) {
        modalFolderList.innerHTML = '<div class="empty-folders">📂 No subfolders here (You can create one or select this folder)</div>';
        return;
    }

    folders.forEach(f => {
        const item = document.createElement('div');
        item.className = 'folder-item';
        item.onclick = () => loadFolderList(f.path);
        item.innerHTML = `
            <span class="folder-item-icon">📁</span>
            <span class="folder-item-name">${f.name}</span>
            <span class="folder-item-chevron">›</span>
        `;
        modalFolderList.appendChild(item);
    });
}

function navigateUpDir() {
    if (pickerParentPath) {
        loadFolderList(pickerParentPath);
    }
}

function navigateShortcut(name) {
    const target = `${storageRoot}/${name}`;
    loadFolderList(target);
}

function promptCreateNewFolder() {
    const name = prompt("Enter new folder name:", "My_Folder");
    if (!name || !name.trim()) return;

    if (window.AndroidBridge && window.AndroidBridge.createFolder) {
        try {
            const res = JSON.parse(window.AndroidBridge.createFolder(pickerCurrentPath, name.trim()));
            if (res.success && res.path) {
                showToast("Folder created: " + name);
                loadFolderList(res.path);
            } else {
                showToast("Error: " + (res.error || "Could not create folder"));
            }
        } catch (e) {
            showToast("Error creating folder: " + e.message);
        }
    } else {
        showToast("Demo: Created folder " + name);
        loadFolderList(`${pickerCurrentPath}/${name.trim()}`);
    }
}

function confirmCurrentFolderSelection() {
    if (pickerTargetType === 'source') {
        setSourcePath(pickerCurrentPath);
        showToast("Source folder selected: " + pickerCurrentPath);
    } else if (pickerTargetType === 'category' && pickerCategoryKey) {
        categoryDestinations[pickerCategoryKey] = pickerCurrentPath;
        renderCategories();
        showToast(`Destination for ${pickerCategoryKey}: ${pickerCurrentPath}`);
    }
    closeFolderPicker();
}

// Browser Simulation Fallback
function simulateFolderList(path) {
    pickerCurrentPath = path;
    const parts = path.split('/').filter(Boolean);
    pickerParentPath = parts.length > 2 ? '/' + parts.slice(0, -1).join('/') : storageRoot;
    breadcrumbPathText.innerText = path;

    btnUpDir.disabled = (path === storageRoot);
    btnUpDir.style.opacity = (path === storageRoot) ? "0.4" : "1";

    const demoDirs = [
        { name: "Download", path: `${storageRoot}/Download` },
        { name: "Pictures", path: `${storageRoot}/Pictures` },
        { name: "Music", path: `${storageRoot}/Music` },
        { name: "Movies", path: `${storageRoot}/Movies` },
        { name: "Documents", path: `${storageRoot}/Documents` },
        { name: "DCIM", path: `${storageRoot}/DCIM` },
        { name: "WhatsApp Media", path: `${storageRoot}/WhatsApp Media` }
    ];
    renderFolderItems(demoDirs);
}

// Scanning
function onRecursiveToggle() {
    if (currentSourcePath) {
        startScan();
    }
}

function startScan() {
    if (!currentSourcePath) {
        showToast("Please choose a Source folder first!");
        return;
    }

    const recursive = document.getElementById('toggleRecursive').checked;
    scanBtn.disabled = true;
    scanBtn.innerText = "Scanning files...";

    if (window.AndroidBridge && window.AndroidBridge.scanFolder && currentSourcePath) {
        window.AndroidBridge.scanFolder(currentSourcePath, recursive);
    } else {
        // Desktop Browser Demo Simulation
        setTimeout(() => {
            window.onScanComplete({
                totalFiles: 86,
                totalBytes: 312500000,
                categories: {
                    'Images': 42,
                    'Documents': 18,
                    'Videos': 8,
                    'Audio': 10,
                    'Archives': 4,
                    'APKs_Apps': 4
                }
            });
        }, 350);
    }
}

window.onScanComplete = function(data) {
    scanBtn.disabled = false;
    scanBtn.innerText = "🔍 Rescan Source Folder";

    totalFilesEl.innerText = data.totalFiles || 0;
    totalSizeEl.innerText = formatBytes(data.totalBytes || 0);

    for (let c in defaultCategories) defaultCategories[c].count = 0;

    if (data.categories) {
        for (let [k, count] of Object.entries(data.categories)) {
            if (defaultCategories[k]) defaultCategories[k].count = count;
            else defaultCategories['Misc'].count += count;
        }
    }

    renderCategories();
    showToast(`Found ${data.totalFiles || 0} files ready to sort!`);
};

// Start Sorting / Transfer
function onStartSortClicked() {
    if (isSorting) return;

    if (!currentSourcePath) {
        showToast("⚠️ Please choose a Source folder first!");
        return;
    }

    const recursive = document.getElementById('toggleRecursive').checked;
    isDryRun = document.getElementById('toggleDryRun').checked;
    const destJson = JSON.stringify(categoryDestinations);

    isSorting = true;
    sortBtn.disabled = true;
    progressCard.style.display = 'block';
    progressBar.style.width = '0%';
    progressPercent.innerText = '0%';
    progressText.innerText = isDryRun ? "Simulating sort (Dry Run)..." : "Transferring files...";

    if (window.AndroidBridge && window.AndroidBridge.startSort) {
        window.AndroidBridge.startSort(currentSourcePath, destJson, recursive, isDryRun);
    } else {
        simulateSortDemo();
    }
}

window.onSortProgress = function(current, total, fileName, targetFolder) {
    const pct = total > 0 ? Math.floor((current / total) * 100) : 0;
    progressBar.style.width = pct + '%';
    progressPercent.innerText = pct + '%';
    progressText.innerText = `${current} / ${total} files`;
    progressFile.innerText = `Transferring: ${fileName} ➔ ${targetFolder}/`;
};

window.onSortComplete = function(movedCount, dryRun) {
    isSorting = false;
    sortBtn.disabled = false;
    progressBar.style.width = '100%';
    progressPercent.innerText = '100%';

    const actionText = dryRun ? "Dry run preview completed" : "Successfully transferred";
    progressText.innerText = `${actionText} (${movedCount} files)!`;
    progressFile.innerText = dryRun ? "No files were moved." : "Files organized into respective category folders.";

    showToast(`✅ ${actionText} ${movedCount} files!`);

    if (!dryRun) {
        setTimeout(startScan, 1000);
    }
};

// Undo Sort
function onUndoClicked() {
    if (isSorting) return;

    showToast("Reverting last file operations...");
    if (window.AndroidBridge && window.AndroidBridge.undoSort) {
        window.AndroidBridge.undoSort();
    } else {
        setTimeout(() => {
            window.onUndoComplete(86, "Demo: Successfully restored 86 files to original folders.");
        }, 500);
    }
}

window.onUndoComplete = function(revertedCount, message) {
    showToast(message || `Reverted ${revertedCount} files.`);
    progressCard.style.display = 'none';
    if (revertedCount > 0) {
        startScan();
    }
};

window.onError = function(errorMessage) {
    isSorting = false;
    sortBtn.disabled = false;
    scanBtn.disabled = false;
    showToast("⚠️ " + errorMessage);
    progressText.innerText = "Error encountered.";
};

function simulateSortDemo() {
    const files = [
        { name: "IMG_20261101_1021.jpg", cat: "Images" },
        { name: "Document_Contract_v2.pdf", cat: "Documents" },
        { name: "GameCapture_4K.mp4", cat: "Videos" },
        { name: "Podcast_Episode_12.mp3", cat: "Audio" },
        { name: "Project_Backup.zip", cat: "Archives" },
        { name: "CustomApp_v1.0.apk", cat: "APKs_Apps" }
    ];

    let current = 0;
    const interval = setInterval(() => {
        current++;
        const item = files[(current - 1) % files.length];
        const dest = categoryDestinations[item.cat] || item.cat;
        const folderName = dest.split('/').pop() || dest;
        window.onSortProgress(current, files.length, item.name, folderName);

        if (current >= files.length) {
            clearInterval(interval);
            setTimeout(() => {
                window.onSortComplete(files.length, isDryRun);
            }, 300);
        }
    }, 220);
}

// Helpers
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

let toastTimer = null;
function showToast(msg) {
    if (!toastEl) return;
    toastEl.innerText = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3200);
}
