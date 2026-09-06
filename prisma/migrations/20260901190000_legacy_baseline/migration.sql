-- Legacy schema baseline generated from git HEAD.\n-- Fresh databases create the pre-NexaClass schema here; existing databases\n-- must be marked applied only after schema verification on staging.\n\n-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "student_number" TEXT,
    "guardian_number" TEXT,
    "copyright_code" VARCHAR(10),
    "teacher_subject" TEXT,
    "teacher_avatar_url" TEXT,
    "teacher_homepage_order" INTEGER,
    "current_session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "description_en" TEXT,
    "short_desc" VARCHAR(300),
    "short_desc_en" VARCHAR(300),
    "image_url" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "duration" TEXT,
    "level" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "max_quiz_attempts" INTEGER,
    "category_id" TEXT,
    "created_by_id" TEXT,
    "accepts_homework" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "video_url" TEXT,
    "pdf_url" TEXT,
    "duration" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "course_id" TEXT NOT NULL,
    "accepts_homework" BOOLEAN NOT NULL DEFAULT false,
    "playback_limit_enabled" BOOLEAN NOT NULL DEFAULT true,
    "playback_required_minutes" INTEGER NOT NULL DEFAULT 15,
    "playback_max_attempts" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "time_limit_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "quiz_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationCode" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),
    "used_by_user_id" TEXT,

    CONSTRAINT "ActivationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationCodeLesson" (
    "activation_code_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,

    CONSTRAINT "ActivationCodeLesson_pkey" PRIMARY KEY ("activation_code_id","lesson_id")
);

-- CreateTable
CREATE TABLE "ActivationCodeQuiz" (
    "activation_code_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,

    CONSTRAINT "ActivationCodeQuiz_pkey" PRIMARY KEY ("activation_code_id","quiz_id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveStream" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "provider" TEXT NOT NULL,
    "meeting_url" TEXT NOT NULL,
    "meeting_id" TEXT,
    "meeting_password" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordChangeRequest" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "new_password_hash" TEXT NOT NULL,
    "requested_identifier" TEXT,
    "requested_old_password" TEXT,
    "requested_new_password_plain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by_id" TEXT,

    CONSTRAINT "PasswordChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "text_en" TEXT,
    "author_name" TEXT NOT NULL,
    "author_title" TEXT,
    "author_title_en" TEXT,
    "avatar_letter" TEXT,
    "image_url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "teacher_image_url" TEXT,
    "hero_title" TEXT,
    "hero_title_en" TEXT,
    "hero_slogan" TEXT,
    "hero_slogan_en" TEXT,
    "platform_name" TEXT,
    "platform_name_en" TEXT,
    "header_logo_url" TEXT,
    "primary_color" TEXT,
    "youtube_url" TEXT,
    "linkedin_url" TEXT,
    "whatsapp_url" TEXT,
    "facebook_url" TEXT,
    "telegram_url" TEXT,
    "team_youtube_url" TEXT,
    "team_linkedin_url" TEXT,
    "team_whatsapp_url" TEXT,
    "team_facebook_url" TEXT,
    "team_telegram_url" TEXT,
    "social_right_label" TEXT,
    "social_right_label_en" TEXT,
    "social_left_label" TEXT,
    "social_left_label_en" TEXT,
    "social_left_enabled" BOOLEAN NOT NULL DEFAULT true,
    "page_title" TEXT,
    "page_title_en" TEXT,
    "hero_bg_preset" TEXT,
    "hero_bg_custom_from" TEXT,
    "hero_bg_custom_to" TEXT,
    "hero_float_image_1" TEXT,
    "hero_float_image_2" TEXT,
    "hero_float_image_3" TEXT,
    "hero_template" TEXT,
    "hero_slider_image_1" TEXT,
    "hero_slider_image_2" TEXT,
    "hero_slider_image_3" TEXT,
    "hero_slider_image_4" TEXT,
    "hero_slider_image_5" TEXT,
    "hero_slider_course_id_1" TEXT,
    "hero_slider_course_id_2" TEXT,
    "hero_slider_course_id_3" TEXT,
    "hero_slider_course_id_4" TEXT,
    "hero_slider_course_id_5" TEXT,
    "hero_slider_interval_ms" INTEGER,
    "hero3_title" TEXT,
    "hero3_title_en" TEXT,
    "hero3_subtitle" TEXT,
    "hero3_subtitle_en" TEXT,
    "hero3_phone_image_url" TEXT,
    "hero3_phone_bg_color" TEXT,
    "hero3_store_badge_1_image_url" TEXT,
    "hero3_store_badge_1_link" TEXT,
    "hero3_store_badge_2_image_url" TEXT,
    "hero3_store_badge_2_link" TEXT,
    "footer_title" TEXT,
    "footer_title_en" TEXT,
    "footer_tagline" TEXT,
    "footer_tagline_en" TEXT,
    "footer_copyright" TEXT,
    "footer_copyright_en" TEXT,
    "reviews_section_title" TEXT,
    "reviews_section_title_en" TEXT,
    "reviews_section_subtitle" TEXT,
    "reviews_section_subtitle_en" TEXT,
    "reviews_section_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cta_badge_text" TEXT,
    "cta_badge_text_en" TEXT,
    "cta_title" TEXT,
    "cta_title_en" TEXT,
    "cta_description" TEXT,
    "cta_description_en" TEXT,
    "cta_button_text" TEXT,
    "cta_button_text_en" TEXT,
    "teachers_enabled" BOOLEAN NOT NULL DEFAULT false,
    "subscriptions_enabled" BOOLEAN NOT NULL DEFAULT false,
    "store_enabled" BOOLEAN NOT NULL DEFAULT false,
    "store_section_title" TEXT,
    "store_section_title_en" TEXT,
    "store_section_description" TEXT,
    "store_section_description_en" TEXT,
    "platform_details_enabled" BOOLEAN NOT NULL DEFAULT false,
    "platform_details_title" TEXT,
    "platform_details_title_en" TEXT,
    "platform_details_subtitle" TEXT,
    "platform_details_subtitle_en" TEXT,
    "platform_details_background_color" TEXT,
    "platform_details_items" TEXT,
    "platform_news_enabled" BOOLEAN NOT NULL DEFAULT false,
    "platform_news_items" TEXT,
    "platform_news_section_title" TEXT,
    "platform_news_section_title_en" TEXT,
    "add_balance_title" TEXT,
    "add_balance_title_en" TEXT,
    "add_balance_subtitle" TEXT,
    "add_balance_subtitle_en" TEXT,
    "add_balance_method_title" TEXT,
    "add_balance_method_title_en" TEXT,
    "add_balance_transfer_instruction" TEXT,
    "add_balance_transfer_instruction_en" TEXT,
    "add_balance_wallet_number" TEXT,
    "add_balance_confirmation_note" TEXT,
    "add_balance_confirmation_note_en" TEXT,
    "add_balance_whatsapp_number" TEXT,
    "add_balance_whatsapp_button_text" TEXT,
    "add_balance_whatsapp_button_text_en" TEXT,
    "add_balance_waiting_note" TEXT,
    "add_balance_waiting_note_en" TEXT,
    "copyright_overlay_style" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkSubmission" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT,
    "submission_type" TEXT NOT NULL,
    "link_url" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "staff_user_id" TEXT NOT NULL,
    "student_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "content" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "pdf_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStorePurchase" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStorePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT,
    "duration_kind" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlatformSubscription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "price_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPlatformSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonRating" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlaybackAttempt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "is_playing" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "counted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlaybackAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_copyright_code_idx" ON "User"("copyright_code");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_slug_idx" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_category_id_idx" ON "Course"("category_id");

-- CreateIndex
CREATE INDEX "Course_created_by_id_idx" ON "Course"("created_by_id");

-- CreateIndex
CREATE INDEX "Lesson_course_id_idx" ON "Lesson"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_course_id_slug_key" ON "Lesson"("course_id", "slug");

-- CreateIndex
CREATE INDEX "Quiz_course_id_idx" ON "Quiz"("course_id");

-- CreateIndex
CREATE INDEX "Question_quiz_id_idx" ON "Question"("quiz_id");

-- CreateIndex
CREATE INDEX "QuestionOption_question_id_idx" ON "QuestionOption"("question_id");

-- CreateIndex
CREATE INDEX "Enrollment_user_id_idx" ON "Enrollment"("user_id");

-- CreateIndex
CREATE INDEX "Enrollment_course_id_idx" ON "Enrollment"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_user_id_course_id_key" ON "Enrollment"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationCode_code_key" ON "ActivationCode"("code");

-- CreateIndex
CREATE INDEX "ActivationCode_course_id_idx" ON "ActivationCode"("course_id");

-- CreateIndex
CREATE INDEX "ActivationCode_code_idx" ON "ActivationCode"("code");

-- CreateIndex
CREATE INDEX "ActivationCode_created_at_idx" ON "ActivationCode"("created_at");

-- CreateIndex
CREATE INDEX "ActivationCodeLesson_activation_code_id_idx" ON "ActivationCodeLesson"("activation_code_id");

-- CreateIndex
CREATE INDEX "ActivationCodeLesson_lesson_id_idx" ON "ActivationCodeLesson"("lesson_id");

-- CreateIndex
CREATE INDEX "ActivationCodeQuiz_activation_code_id_idx" ON "ActivationCodeQuiz"("activation_code_id");

-- CreateIndex
CREATE INDEX "ActivationCodeQuiz_quiz_id_idx" ON "ActivationCodeQuiz"("quiz_id");

-- CreateIndex
CREATE INDEX "QuizAttempt_user_id_quiz_id_idx" ON "QuizAttempt"("user_id", "quiz_id");

-- CreateIndex
CREATE INDEX "QuizAttempt_user_id_idx" ON "QuizAttempt"("user_id");

-- CreateIndex
CREATE INDEX "Payment_created_at_idx" ON "Payment"("created_at");

-- CreateIndex
CREATE INDEX "LiveStream_course_id_idx" ON "LiveStream"("course_id");

-- CreateIndex
CREATE INDEX "LiveStream_scheduled_at_idx" ON "LiveStream"("scheduled_at");

-- CreateIndex
CREATE INDEX "PasswordChangeRequest_user_id_idx" ON "PasswordChangeRequest"("user_id");

-- CreateIndex
CREATE INDEX "PasswordChangeRequest_status_idx" ON "PasswordChangeRequest"("status");

-- CreateIndex
CREATE INDEX "PasswordChangeRequest_created_at_idx" ON "PasswordChangeRequest"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Review_order_idx" ON "Review"("order");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_course_id_idx" ON "HomeworkSubmission"("course_id");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_user_id_idx" ON "HomeworkSubmission"("user_id");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_created_at_idx" ON "HomeworkSubmission"("created_at");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_lesson_id_idx" ON "HomeworkSubmission"("lesson_id");

-- CreateIndex
CREATE INDEX "Conversation_staff_user_id_idx" ON "Conversation"("staff_user_id");

-- CreateIndex
CREATE INDEX "Conversation_student_user_id_idx" ON "Conversation"("student_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_staff_user_id_student_user_id_key" ON "Conversation"("staff_user_id", "student_user_id");

-- CreateIndex
CREATE INDEX "Message_conversation_id_idx" ON "Message"("conversation_id");

-- CreateIndex
CREATE INDEX "Message_created_at_idx" ON "Message"("created_at");

-- CreateIndex
CREATE INDEX "StoreProduct_is_active_sort_order_created_at_idx" ON "StoreProduct"("is_active", "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "UserStorePurchase_user_id_created_at_idx" ON "UserStorePurchase"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserStorePurchase_user_id_product_id_key" ON "UserStorePurchase"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_is_active_sort_order_idx" ON "SubscriptionPlan"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "UserPlatformSubscription_user_id_expires_at_idx" ON "UserPlatformSubscription"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "LessonRating_lesson_id_idx" ON "LessonRating"("lesson_id");

-- CreateIndex
CREATE INDEX "LessonRating_course_id_idx" ON "LessonRating"("course_id");

-- CreateIndex
CREATE INDEX "LessonRating_user_id_idx" ON "LessonRating"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_rating_unique_lesson_user" ON "LessonRating"("lesson_id", "user_id");

-- CreateIndex
CREATE INDEX "LessonPlaybackAttempt_user_id_lesson_id_idx" ON "LessonPlaybackAttempt"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "LessonPlaybackAttempt_user_id_lesson_id_counted_at_idx" ON "LessonPlaybackAttempt"("user_id", "lesson_id", "counted_at");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationCodeLesson" ADD CONSTRAINT "ActivationCodeLesson_activation_code_id_fkey" FOREIGN KEY ("activation_code_id") REFERENCES "ActivationCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationCodeLesson" ADD CONSTRAINT "ActivationCodeLesson_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationCodeQuiz" ADD CONSTRAINT "ActivationCodeQuiz_activation_code_id_fkey" FOREIGN KEY ("activation_code_id") REFERENCES "ActivationCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationCodeQuiz" ADD CONSTRAINT "ActivationCodeQuiz_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStream" ADD CONSTRAINT "LiveStream_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordChangeRequest" ADD CONSTRAINT "PasswordChangeRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordChangeRequest" ADD CONSTRAINT "PasswordChangeRequest_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStorePurchase" ADD CONSTRAINT "UserStorePurchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStorePurchase" ADD CONSTRAINT "UserStorePurchase_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "StoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlatformSubscription" ADD CONSTRAINT "UserPlatformSubscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlatformSubscription" ADD CONSTRAINT "UserPlatformSubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRating" ADD CONSTRAINT "LessonRating_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRating" ADD CONSTRAINT "LessonRating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRating" ADD CONSTRAINT "LessonRating_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlaybackAttempt" ADD CONSTRAINT "LessonPlaybackAttempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlaybackAttempt" ADD CONSTRAINT "LessonPlaybackAttempt_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
