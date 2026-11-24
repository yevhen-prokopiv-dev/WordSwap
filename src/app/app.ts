import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly text = signal('');
  protected readonly synonyms = signal<string[]>([]);
  protected readonly message = signal('');

  protected readonly selection = signal<{
    start: number;
    end: number;
    selectedText: string;
  } | null>(null);

  protected readonly wordCount = computed(() => {
    const trimmedText = this.text().trim();
    return trimmedText === '' ? 0 : trimmedText.split(/\s+/).length;
  });

  protected onTextInput(value: string): void {
    this.text.set(value);
    this.selection.set(null);
    this.synonyms.set([]);
    this.message.set('');
  }

  protected async readSelection(editor: HTMLTextAreaElement): Promise<void> {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.slice(start, end);

    this.synonyms.set([]);

    if (selectedText.trim() === '') {
      this.selection.set(null);
      this.message.set('Виділи слово або фразу в тексті.');
      return;
    }

    const fragment = { start, end, selectedText };
    this.selection.set(fragment);
    this.message.set('Шукаємо синоніми…');

    const url = new URL('https://api.datamuse.com/words');
    url.searchParams.set('rel_syn', selectedText.trim());
    url.searchParams.set('max', '5');

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const results: { word: string }[] = await response.json();

      // Поки тривав запит, користувач міг змінити текст або почати інший пошук.
      if (this.selection() !== fragment) return;

      this.synonyms.set(results.map(result => result.word));
      this.message.set(results.length === 0 ? 'Синонімів не знайдено.' : '');
    } catch {
      if (this.selection() === fragment) {
        this.message.set('Не вдалося отримати синоніми. Спробуй ще раз.');
      }
    }
  }
  protected replaceSelection(word: string): void {
    const fragment = this.selection();
    if (!fragment) return;

    const currentText = this.text();
    const before = currentText.slice(0, fragment.start);
    const after = currentText.slice(fragment.end);

    this.onTextInput(before + word + after);
  }
  protected async copyText(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.message.set('Текст скопійовано.');
    } catch {
        this.message.set('Не вдалося скопіювати текст.');
    }
  }
}
