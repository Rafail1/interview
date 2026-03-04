DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'in_play_ranges'
      AND column_name = 'activationReason'
  ) THEN
    ALTER TABLE "in_play_ranges" ALTER COLUMN "activationReason" DROP DEFAULT;
  END IF;
END $$;
