-- CreateEnum
CREATE TYPE "UserGlobalRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'FULL_DAY', 'FOUR_HOURS', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "KycDocType" AS ENUM ('AADHAAR', 'PASSPORT', 'VOTER_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SeatAssignmentStatus" AS ENUM ('ACTIVE', 'RELEASED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('RAZORPAY', 'CASHFREE', 'MANUAL_ADMIN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32),
    "full_name" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "role" "UserGlobalRole" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "libraries" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "contact_phone" VARCHAR(32) NOT NULL,
    "contact_email" VARCHAR(255),
    "settings" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "libraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "floor" VARCHAR(32),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rows" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "has_locker" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "row_id" UUID NOT NULL,
    "seat_number" VARCHAR(64) NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "has_locker" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "father_name" VARCHAR(255),
    "mother_name" VARCHAR(255),
    "address" TEXT,
    "study_purpose" VARCHAR(255),
    "photo_url" TEXT,
    "kyc_doc_id" VARCHAR(255),
    "kyc_doc_type" "KycDocType" NOT NULL DEFAULT 'AADHAAR',
    "kyc_photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "expected_end_date" DATE NOT NULL,
    "actual_end_date" DATE,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "fee_amount" DECIMAL(10,2) NOT NULL,
    "shift" "ShiftType" NOT NULL DEFAULT 'FULL_DAY',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_assignments" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "shift" "ShiftType" NOT NULL DEFAULT 'FULL_DAY',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "SeatAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "price_monthly" DECIMAL(10,2) NOT NULL,
    "price_yearly" DECIMAL(10,2) NOT NULL,
    "max_seats" INTEGER NOT NULL DEFAULT 50,
    "max_libraries" INTEGER NOT NULL DEFAULT 1,
    "features" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "auto_renew_cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "provider" "PaymentGatewayProvider" NOT NULL DEFAULT 'MANUAL_ADMIN',
    "provider_subscription_id" VARCHAR(128),
    "admin_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "subscription_id" UUID,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "provider_payment_id" VARCHAR(128),
    "provider_order_id" VARCHAR(128),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_order_amount" DECIMAL(10,2),
    "max_discount_amount" DECIMAL(10,2),
    "max_redemptions" INTEGER,
    "per_user_limit" INTEGER NOT NULL DEFAULT 1,
    "valid_from" TIMESTAMPTZ NOT NULL,
    "valid_until" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "payment_id" UUID,
    "discount_applied" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fee_transactions" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "membership_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "total_fee" DECIMAL(10,2),
    "remaining_fee" DECIMAL(10,2),
    "paid_for_month" VARCHAR(32) NOT NULL,
    "payment_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_from" TIMESTAMPTZ,
    "valid_to" TIMESTAMPTZ,
    "payment_mode" VARCHAR(32) NOT NULL DEFAULT 'UPI',
    "status" VARCHAR(32) NOT NULL DEFAULT 'PAID',
    "receipt_number" VARCHAR(64),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_fee_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "library_id" UUID,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "library_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_slug_key" ON "libraries"("slug");

-- CreateIndex
CREATE INDEX "libraries_owner_id_idx" ON "libraries"("owner_id");

-- CreateIndex
CREATE INDEX "libraries_slug_idx" ON "libraries"("slug");

-- CreateIndex
CREATE INDEX "libraries_is_active_idx" ON "libraries"("is_active");

-- CreateIndex
CREATE INDEX "rooms_library_id_is_active_idx" ON "rooms"("library_id", "is_active");

-- CreateIndex
CREATE INDEX "rows_library_id_room_id_idx" ON "rows"("library_id", "room_id");

-- CreateIndex
CREATE INDEX "seats_library_id_status_idx" ON "seats"("library_id", "status");

-- CreateIndex
CREATE INDEX "seats_row_id_idx" ON "seats"("row_id");

-- CreateIndex
CREATE UNIQUE INDEX "seats_library_id_row_id_seat_number_key" ON "seats"("library_id", "row_id", "seat_number");

-- CreateIndex
CREATE INDEX "students_library_id_phone_idx" ON "students"("library_id", "phone");

-- CreateIndex
CREATE INDEX "students_library_id_full_name_idx" ON "students"("library_id", "full_name");

-- CreateIndex
CREATE INDEX "students_library_id_is_active_idx" ON "students"("library_id", "is_active");

-- CreateIndex
CREATE INDEX "memberships_library_id_status_expected_end_date_idx" ON "memberships"("library_id", "status", "expected_end_date");

-- CreateIndex
CREATE INDEX "memberships_student_id_idx" ON "memberships"("student_id");

-- CreateIndex
CREATE INDEX "seat_assignments_library_id_student_id_status_idx" ON "seat_assignments"("library_id", "student_id", "status");

-- CreateIndex
CREATE INDEX "seat_assignments_seat_id_shift_status_idx" ON "seat_assignments"("seat_id", "shift", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscriptions_library_id_status_idx" ON "subscriptions"("library_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_library_id_idx" ON "payments"("library_id");

-- CreateIndex
CREATE INDEX "payments_provider_provider_order_id_idx" ON "payments"("provider", "provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupon_usages_coupon_id_user_id_idx" ON "coupon_usages"("coupon_id", "user_id");

-- CreateIndex
CREATE INDEX "student_fee_transactions_library_id_payment_date_idx" ON "student_fee_transactions"("library_id", "payment_date" DESC);

-- CreateIndex
CREATE INDEX "student_fee_transactions_student_id_paid_for_month_idx" ON "student_fee_transactions"("student_id", "paid_for_month");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_library_id_idx" ON "push_subscriptions"("library_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_is_active_idx" ON "push_subscriptions"("is_active");

-- CreateIndex
CREATE INDEX "app_notifications_user_id_is_read_idx" ON "app_notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "app_notifications_library_id_created_at_idx" ON "app_notifications"("library_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rows" ADD CONSTRAINT "rows_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rows" ADD CONSTRAINT "rows_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_row_id_fkey" FOREIGN KEY ("row_id") REFERENCES "rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_assignments" ADD CONSTRAINT "seat_assignments_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_assignments" ADD CONSTRAINT "seat_assignments_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_assignments" ADD CONSTRAINT "seat_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_assignments" ADD CONSTRAINT "seat_assignments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_transactions" ADD CONSTRAINT "student_fee_transactions_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_transactions" ADD CONSTRAINT "student_fee_transactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_transactions" ADD CONSTRAINT "student_fee_transactions_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
