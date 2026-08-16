package com.example.audiobookreader.ui.library

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.audiobookreader.domain.model.Book

@Composable
fun LibraryScreen(viewModel: LibraryViewModel) {
    val books by viewModel.books.collectAsState()
    val isImporting by viewModel.isImporting.collectAsState()
    val message by viewModel.message.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let(viewModel::importBook)
    }
    val addBook = { picker.launch(arrayOf("application/epub+zip", "application/pdf")) }

    LaunchedEffect(message) {
        message?.let { snackbar.showSnackbar(it); viewModel.dismissMessage() }
    }
    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        if (books.isEmpty()) EmptyLibrary(isImporting, Modifier.padding(padding), addBook)
        else LibraryContent(books, isImporting, Modifier.padding(padding), addBook)
    }
}

@Composable
private fun EmptyLibrary(importing: Boolean, modifier: Modifier, onAdd: () -> Unit) {
    Column(
        modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Biblioteka", style = MaterialTheme.typography.headlineMedium)
        Text("Brak książek. Dodaj EPUB lub PDF z pamięci telefonu.", Modifier.padding(vertical = 20.dp))
        Button(onClick = onAdd, enabled = !importing) {
            if (importing) CircularProgressIndicator(Modifier.size(24.dp)) else Text("Dodaj książkę")
        }
    }
}

@Composable
private fun LibraryContent(books: List<Book>, importing: Boolean, modifier: Modifier, onAdd: () -> Unit) {
    LazyColumn(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Button(onClick = onAdd, enabled = !importing) {
                Text(if (importing) "Importowanie…" else "Dodaj książkę")
            }
        }
        items(books, key = { it.id }) { book ->
            Column {
                Text(book.title.ifEmpty { "Bez tytułu" }, style = MaterialTheme.typography.titleMedium)
                Text(book.author.ifEmpty { "Nieznany autor" })
                Text("Format: ${book.format.name} • ${book.processingStatus.name}")
            }
        }
    }
}
