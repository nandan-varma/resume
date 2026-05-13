ALTER TABLE "resumes" ADD COLUMN "job_id" integer;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resumes_jobId_idx" ON "resumes" USING btree ("job_id");