DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'completed') THEN 
        ALTER TABLE daily_tasks ADD COLUMN completed boolean DEFAULT false; 
    END IF; 
END $$;
