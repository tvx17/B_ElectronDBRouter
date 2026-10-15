export interface Note {
  id: string;
  title: string;
}

export interface Database {
  provider: "pglite" | "sqlite";
  listNotes(): Promise<Note[]>;
  addNote(title: string): Promise<Note>;
  close(): Promise<void>;
}
