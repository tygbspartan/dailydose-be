SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'reviews'::regclass
AND contype = 'u';
