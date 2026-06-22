CREATE TABLE "job_resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"resume_latex" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_resumes" ADD CONSTRAINT "job_resumes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_resumes" ADD CONSTRAINT "job_resumes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "job_resumes_jobId_idx" ON "job_resumes" USING btree ("job_id");
--> statement-breakpoint
CREATE INDEX "job_resumes_userId_idx" ON "job_resumes" USING btree ("user_id");
