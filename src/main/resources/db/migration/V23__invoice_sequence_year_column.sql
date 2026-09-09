-- `year` is reserved in H2 and some SQL dialects; rename for portable numbering.
ALTER TABLE invoice_sequences RENAME COLUMN year TO seq_year;
