package com.autosort.filesorter

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.Locale

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private val scope = CoroutineScope(Dispatchers.Main + Job())

    data class MoveRecord(
        val currentPath: String,
        val originalPath: String
    )
    private val undoStack = mutableListOf<List<MoveRecord>>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Hardware acceleration & Max 240Hz Refresh Rate
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )
        optimizeDisplayRefreshRate()

        webView = WebView(this).apply {
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    checkAndNotifyPermission()
                }
            }
            addJavascriptInterface(KotlinBridge(), "AndroidBridge")
        }
        setContentView(webView)

        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onResume() {
        super.onResume()
        optimizeDisplayRefreshRate()
        checkAndNotifyPermission()
    }

    private fun optimizeDisplayRefreshRate() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Find highest supported display mode (up to 240Hz)
                val modes = display?.supportedModes
                val maxMode = modes?.maxByOrNull { it.refreshRate }
                if (maxMode != null) {
                    val lp = window.attributes
                    lp.preferredDisplayModeId = maxMode.modeId
                    window.attributes = lp
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val lp = window.attributes
                lp.preferredRefreshRate = 240f
                window.attributes = lp
            }
        } catch (ignored: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    private fun checkAndNotifyPermission() {
        val granted = hasStoragePermission()
        val defaultRoot = Environment.getExternalStorageDirectory().absolutePath
        runOnJs("window.onPermissionStatusChanged($granted, '${escape(defaultRoot)}');")
    }

    private fun hasStoragePermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        }
    }

    inner class KotlinBridge {

        @JavascriptInterface
        fun checkPermission(): Boolean {
            return hasStoragePermission()
        }

        @JavascriptInterface
        fun requestPermission() {
            runOnUiThread {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    try {
                        val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                            data = Uri.parse("package:$packageName")
                        }
                        startActivity(intent)
                    } catch (e: Exception) {
                        val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                        startActivity(intent)
                    }
                } else {
                    requestPermissions(
                        arrayOf(
                            android.Manifest.permission.READ_EXTERNAL_STORAGE,
                            android.Manifest.permission.WRITE_EXTERNAL_STORAGE
                        ),
                        101
                    )
                }
            }
        }

        @JavascriptInterface
        fun getStorageRoot(): String {
            return Environment.getExternalStorageDirectory().absolutePath
        }

        @JavascriptInterface
        fun listFolders(pathStr: String): String {
            val result = JSONObject()
            try {
                val rootPath = Environment.getExternalStorageDirectory().absolutePath
                val targetPath = if (pathStr.isBlank()) rootPath else pathStr
                val dir = File(targetPath)

                if (!dir.exists() || !dir.isDirectory) {
                    result.put("error", "Directory not found")
                    return result.toString()
                }

                result.put("currentPath", dir.absolutePath)
                result.put("rootPath", rootPath)
                result.put("parentPath", if (dir.absolutePath == rootPath) "" else (dir.parentFile?.absolutePath ?: ""))

                val foldersArr = JSONArray()
                val files = dir.listFiles()
                if (files != null) {
                    files.filter { it.isDirectory && !it.name.startsWith(".") && it.canRead() }
                        .sortedBy { it.name.lowercase(Locale.ROOT) }
                        .forEach { f ->
                            val obj = JSONObject()
                            obj.put("name", f.name)
                            obj.put("path", f.absolutePath)
                            foldersArr.put(obj)
                        }
                }
                result.put("folders", foldersArr)
            } catch (e: Exception) {
                result.put("error", e.message ?: "Failed to list folders")
            }
            return result.toString()
        }

        @JavascriptInterface
        fun createFolder(parentPath: String, folderName: String): String {
            val result = JSONObject()
            try {
                val clean = folderName.trim().replace(Regex("[\\\\/:*?\"<>|]"), "_")
                if (clean.isBlank()) {
                    result.put("success", false)
                    result.put("error", "Invalid folder name")
                    return result.toString()
                }
                val newDir = File(parentPath, clean)
                if (newDir.exists()) {
                    result.put("success", true)
                    result.put("path", newDir.absolutePath)
                    result.put("alreadyExists", true)
                } else {
                    val created = newDir.mkdirs()
                    result.put("success", created)
                    result.put("path", newDir.absolutePath)
                }
            } catch (e: Exception) {
                result.put("success", false)
                result.put("error", e.message ?: "Error creating folder")
            }
            return result.toString()
        }

        @JavascriptInterface
        fun scanFolder(pathStr: String, recursive: Boolean) {
            scope.launch(Dispatchers.IO) {
                runScan(pathStr, recursive)
            }
        }

        @JavascriptInterface
        fun startSort(
            sourcePath: String,
            categoryDestinationsJson: String,
            recursive: Boolean,
            dryRun: Boolean
        ) {
            scope.launch(Dispatchers.IO) {
                runSort(sourcePath, categoryDestinationsJson, recursive, dryRun)
            }
        }

        @JavascriptInterface
        fun undoSort() {
            scope.launch(Dispatchers.IO) {
                runUndo()
            }
        }
    }

    private suspend fun runScan(pathStr: String, recursive: Boolean) {
        try {
            val root = File(pathStr)
            if (!root.exists() || !root.isDirectory) {
                runOnJs("window.onError('Source folder does not exist or is not readable.');")
                return
            }

            val files = mutableListOf<File>()
            collectFiles(root, files, recursive)

            val counts = mutableMapOf<String, Int>()
            var totalBytes = 0L
            var fileCount = 0

            for (file in files) {
                if (file.isFile) {
                    val cat = getBaseCategory(file.name)
                    counts[cat] = (counts[cat] ?: 0) + 1
                    totalBytes += file.length()
                    fileCount++
                }
            }

            val json = JSONObject().apply {
                put("totalFiles", fileCount)
                put("totalBytes", totalBytes)
                val catsObj = JSONObject()
                counts.forEach { (k, v) -> catsObj.put(k, v) }
                put("categories", catsObj)
            }

            runOnJs("window.onScanComplete($json);")
        } catch (e: Exception) {
            runOnJs("window.onError('Scan error: ${escape(e.message)}');")
        }
    }

    private suspend fun runSort(
        sourcePathStr: String,
        categoryDestinationsJson: String,
        recursive: Boolean,
        dryRun: Boolean
    ) {
        try {
            val sourceDir = File(sourcePathStr)
            if (!sourceDir.exists() || !sourceDir.isDirectory) {
                runOnJs("window.onError('Source directory not found.');")
                return
            }

            // Map: Category Name -> User's Chosen Destination Folder Path
            val destMap = mutableMapOf<String, String>()
            try {
                val jsonMap = JSONObject(categoryDestinationsJson)
                val keys = jsonMap.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    val path = jsonMap.getString(k)
                    if (path.isNotBlank()) {
                        destMap[k] = path
                    }
                }
            } catch (ignored: Exception) {}

            val allFiles = mutableListOf<File>()
            collectFiles(sourceDir, allFiles, recursive)

            // Filter files that belong to categories with a configured destination folder
            // Also prevent moving if the file is already inside that destination!
            val toSort = allFiles.filter { file ->
                if (!file.isFile) return@filter false
                val cat = getBaseCategory(file.name)
                val targetPath = destMap[cat] ?: return@filter false

                try {
                    val targetDir = File(targetPath)
                    file.parentFile?.canonicalPath != targetDir.canonicalPath
                } catch (e: Exception) {
                    true
                }
            }

            val total = toSort.size
            var moved = 0
            val batch = mutableListOf<MoveRecord>()

            for ((index, file) in toSort.withIndex()) {
                val cat = getBaseCategory(file.name)
                val targetDirPath = destMap[cat] ?: continue
                val targetDir = File(targetDirPath)
                val fileName = file.name

                runOnJs("window.onSortProgress(${index + 1}, $total, '${escape(fileName)}', '${escape(targetDir.name)}');")

                if (!dryRun) {
                    targetDir.mkdirs()
                    val targetFile = getSafeDestinationFile(targetDir, fileName)

                    val renamed = file.renameTo(targetFile)
                    if (renamed) {
                        batch.add(MoveRecord(targetFile.absolutePath, file.absolutePath))
                        moved++
                    } else {
                        // Stream copy + delete fallback
                        try {
                            file.inputStream().use { input ->
                                targetFile.outputStream().use { output ->
                                    input.copyTo(output)
                                }
                            }
                            file.delete()
                            batch.add(MoveRecord(targetFile.absolutePath, file.absolutePath))
                            moved++
                        } catch (ignored: Exception) {}
                    }
                } else {
                    moved++
                }

                delay(12)
            }

            if (!dryRun && batch.isNotEmpty()) {
                undoStack.add(batch)
            }

            runOnJs("window.onSortComplete($moved, $dryRun);")
        } catch (e: Exception) {
            runOnJs("window.onError('Sort failed: ${escape(e.message)}');")
        }
    }

    private suspend fun runUndo() {
        if (undoStack.isEmpty()) {
            runOnJs("window.onUndoComplete(0, 'Nothing to undo!');")
            return
        }

        val lastBatch = undoStack.removeAt(undoStack.lastIndex)
        var reverted = 0

        for (rec in lastBatch) {
            try {
                val currentFile = File(rec.currentPath)
                val originalFile = File(rec.originalPath)
                if (currentFile.exists()) {
                    originalFile.parentFile?.mkdirs()
                    val ok = currentFile.renameTo(originalFile)
                    if (ok) {
                        reverted++
                    } else {
                        currentFile.inputStream().use { inStream ->
                            originalFile.outputStream().use { outStream ->
                                inStream.copyTo(outStream)
                            }
                        }
                        currentFile.delete()
                        reverted++
                    }
                }
            } catch (ignored: Exception) {}
        }

        runOnJs("window.onUndoComplete($reverted, 'Successfully reverted $reverted files.');")
    }

    private fun collectFiles(dir: File, result: MutableList<File>, recursive: Boolean) {
        val children = dir.listFiles() ?: return
        for (child in children) {
            if (child.isFile) {
                result.add(child)
            } else if (child.isDirectory && recursive && !child.name.startsWith(".")) {
                collectFiles(child, result, true)
            }
        }
    }

    private fun getSafeDestinationFile(dir: File, fileName: String): File {
        var candidate = File(dir, fileName)
        if (!candidate.exists()) return candidate

        val dot = fileName.lastIndexOf('.')
        val base = if (dot > 0) fileName.substring(0, dot) else fileName
        val ext = if (dot > 0) fileName.substring(dot) else ""

        var idx = 1
        while (candidate.exists()) {
            candidate = File(dir, "$base ($idx)$ext")
            idx++
        }
        return candidate
    }

    private fun getBaseCategory(name: String?): String {
        if (name.isNullOrBlank()) return "Misc"
        val ext = name.substringAfterLast('.', "").lowercase(Locale.ROOT)

        return when (ext) {
            "jpg", "jpeg", "png", "gif", "svg", "webp", "heic", "raw", "ico", "bmp" -> "Images"
            "pdf", "docx", "doc", "txt", "rtf", "epub", "odt", "md" -> "Documents"
            "mp4", "mkv", "avi", "mov", "flv", "wmv", "webm", "3gp" -> "Videos"
            "mp3", "wav", "aac", "flac", "ogg", "m4a", "wma", "opus" -> "Audio"
            "zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso" -> "Archives"
            "xlsx", "xls", "csv", "tsv", "json", "xml", "parquet" -> "Data_Spreadsheets"
            "apk", "xapk", "apks", "aab" -> "APKs_Apps"
            "py", "kt", "java", "js", "ts", "html", "css", "c", "cpp", "rs", "go", "sh", "sql" -> "Code_Dev"
            else -> "Misc"
        }
    }

    private fun runOnJs(js: String) {
        scope.launch(Dispatchers.Main) {
            webView.evaluateJavascript(js, null)
        }
    }

    private fun escape(str: String?): String {
        return (str ?: "").replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "")
    }
}
