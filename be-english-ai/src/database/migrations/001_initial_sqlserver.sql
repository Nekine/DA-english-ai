-- Baseline SQL Server schema generated from legacy .NET + MySQL behavior.
-- Keep business parity first; optimize only after parity tests pass.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- users
CREATE TABLE dbo.users (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  username NVARCHAR(100) NOT NULL,
  email NVARCHAR(255) NOT NULL,
  password_hash NVARCHAR(255) NOT NULL,
  google_id NVARCHAR(255) NULL,
  facebook_id NVARCHAR(255) NULL,
  phone NVARCHAR(20) NULL,
  full_name NVARCHAR(200) NULL,
  bio NVARCHAR(MAX) NULL,
  address NVARCHAR(255) NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_users_status DEFAULT N'active',
  account_type NVARCHAR(20) NOT NULL CONSTRAINT DF_users_account_type DEFAULT N'free',
  role NVARCHAR(20) NOT NULL CONSTRAINT DF_users_role DEFAULT N'user',
  premium_expires_at DATETIME2(3) NULL,
  total_study_time INT NOT NULL CONSTRAINT DF_users_total_study_time DEFAULT 0,
  total_xp INT NOT NULL CONSTRAINT DF_users_total_xp DEFAULT 0,
  avatar_url NVARCHAR(500) NULL,
  last_active_at DATETIME2(3) NULL,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME()
);
GO

ALTER TABLE dbo.users
  ADD CONSTRAINT CK_users_status CHECK (status IN (N'active', N'inactive', N'banned'));
ALTER TABLE dbo.users
  ADD CONSTRAINT CK_users_account_type CHECK (account_type IN (N'free', N'premium'));
ALTER TABLE dbo.users
  ADD CONSTRAINT CK_users_role CHECK (role IN (N'user', N'admin', N'customer'));
GO

CREATE UNIQUE INDEX UX_users_username ON dbo.users(username);
CREATE UNIQUE INDEX UX_users_email ON dbo.users(email);
CREATE UNIQUE INDEX UX_users_google_id ON dbo.users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX UX_users_facebook_id ON dbo.users(facebook_id) WHERE facebook_id IS NOT NULL;
CREATE INDEX IX_users_status ON dbo.users(status);
CREATE INDEX IX_users_account_type ON dbo.users(account_type);
CREATE INDEX IX_users_role ON dbo.users(role);
CREATE INDEX IX_users_total_xp ON dbo.users(total_xp);
GO

-- exercises
CREATE TABLE dbo.exercises (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  title NVARCHAR(200) NOT NULL,
  content NVARCHAR(MAX) NULL,
  questions_json NVARCHAR(MAX) NOT NULL,
  correct_answers_json NVARCHAR(MAX) NOT NULL,
  level NVARCHAR(50) NULL,
  type NVARCHAR(50) NULL,
  category NVARCHAR(100) NULL,
  estimated_minutes INT NULL,
  time_limit INT NULL,
  audio_url NVARCHAR(255) NULL,
  source_type NVARCHAR(100) NULL,
  created_by INT NULL,
  original_file_name NVARCHAR(255) NULL,
  description NVARCHAR(500) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_exercises_is_active DEFAULT 1,
  ai_generated BIT NOT NULL CONSTRAINT DF_exercises_ai_generated DEFAULT 0,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_exercises_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_exercises_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_exercises_users_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id) ON DELETE SET NULL,
  CONSTRAINT CK_exercises_questions_json CHECK (ISJSON(questions_json) = 1),
  CONSTRAINT CK_exercises_correct_answers_json CHECK (ISJSON(correct_answers_json) = 1)
);
GO

CREATE INDEX IX_exercises_title ON dbo.exercises(title);
CREATE INDEX IX_exercises_type ON dbo.exercises(type);
CREATE INDEX IX_exercises_level ON dbo.exercises(level);
CREATE INDEX IX_exercises_is_active ON dbo.exercises(is_active);
CREATE INDEX IX_exercises_created_by ON dbo.exercises(created_by);
GO

-- exercise_completions
CREATE TABLE dbo.exercise_completions (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  exercise_id INT NOT NULL,
  user_answers_json NVARCHAR(MAX) NULL,
  score DECIMAL(5,2) NULL,
  total_questions INT NULL,
  started_at DATETIME2(3) NULL,
  completed_at DATETIME2(3) NULL,
  is_completed BIT NOT NULL CONSTRAINT DF_exercise_completions_is_completed DEFAULT 0,
  time_spent_minutes INT NULL,
  attempts INT NOT NULL CONSTRAINT DF_exercise_completions_attempts DEFAULT 1,
  ai_graded BIT NOT NULL CONSTRAINT DF_exercise_completions_ai_graded DEFAULT 0,
  review_status NVARCHAR(20) NULL CONSTRAINT DF_exercise_completions_review_status DEFAULT N'pending',
  reviewed_by INT NULL,
  reviewed_at DATETIME2(3) NULL,
  original_score DECIMAL(5,2) NULL,
  final_score DECIMAL(5,2) NULL,
  review_notes NVARCHAR(MAX) NULL,
  confidence_score DECIMAL(3,2) NULL,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_exercise_completions_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_exercise_completions_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
  CONSTRAINT FK_exercise_completions_exercises_exercise_id FOREIGN KEY (exercise_id) REFERENCES dbo.exercises(id) ON DELETE CASCADE,
  CONSTRAINT FK_exercise_completions_users_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES dbo.users(id),
  CONSTRAINT CK_exercise_completions_user_answers_json CHECK (user_answers_json IS NULL OR ISJSON(user_answers_json) = 1),
  CONSTRAINT CK_exercise_completions_review_status CHECK (review_status IS NULL OR review_status IN (N'pending', N'approved', N'rejected', N'needs_regrade')),
  CONSTRAINT CK_exercise_completions_confidence_score CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);
GO

CREATE UNIQUE INDEX UX_exercise_completions_user_exercise_attempt
  ON dbo.exercise_completions(user_id, exercise_id, attempts);
CREATE INDEX IX_exercise_completions_user_id ON dbo.exercise_completions(user_id);
CREATE INDEX IX_exercise_completions_exercise_id ON dbo.exercise_completions(exercise_id);
CREATE INDEX IX_exercise_completions_score ON dbo.exercise_completions(score);
CREATE INDEX IX_exercise_completions_completed_at ON dbo.exercise_completions(completed_at);
CREATE INDEX IX_exercise_completions_review_status ON dbo.exercise_completions(review_status);
GO

-- exercise_completion_scores
CREATE TABLE dbo.exercise_completion_scores (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  completion_id INT NOT NULL,
  question_number INT NOT NULL,
  user_answer NVARCHAR(MAX) NULL,
  correct_answer NVARCHAR(MAX) NULL,
  is_correct BIT NULL,
  points DECIMAL(5,2) NULL,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_exercise_completion_scores_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_exercise_completion_scores_completion_id FOREIGN KEY (completion_id) REFERENCES dbo.exercise_completions(id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_exercise_completion_scores_completion_id
  ON dbo.exercise_completion_scores(completion_id);
CREATE INDEX IX_exercise_completion_scores_completion_question
  ON dbo.exercise_completion_scores(completion_id, question_number);
GO

-- packages
CREATE TABLE dbo.packages (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  name NVARCHAR(150) NOT NULL,
  description NVARCHAR(500) NULL,
  price DECIMAL(19,4) NOT NULL,
  duration_months INT NULL,
  is_active BIT NOT NULL CONSTRAINT DF_packages_is_active DEFAULT 1,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_packages_created_at DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_packages_is_active ON dbo.packages(is_active);
GO

-- payments
CREATE TABLE dbo.payments (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  package_id INT NULL,
  amount DECIMAL(19,4) NOT NULL,
  method NVARCHAR(50) NULL,
  status NVARCHAR(20) NOT NULL,
  is_lifetime BIT NOT NULL CONSTRAINT DF_payments_is_lifetime DEFAULT 0,
  transaction_history NVARCHAR(MAX) NULL,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_payments_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_payments_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_payments_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id),
  CONSTRAINT FK_payments_packages_package_id FOREIGN KEY (package_id) REFERENCES dbo.packages(id),
  CONSTRAINT CK_payments_status CHECK (status IN (N'pending', N'completed', N'failed'))
);
GO

CREATE INDEX IX_payments_user_id ON dbo.payments(user_id);
CREATE INDEX IX_payments_status ON dbo.payments(status);
CREATE INDEX IX_payments_created_at ON dbo.payments(created_at);
CREATE INDEX IX_payments_user_status_created ON dbo.payments(user_id, status, created_at);
GO

-- user_status_history
CREATE TABLE dbo.user_status_history (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  from_status NVARCHAR(20) NULL,
  to_status NVARCHAR(20) NOT NULL,
  reason_code NVARCHAR(50) NULL,
  reason_note NVARCHAR(1000) NULL,
  changed_by INT NULL,
  changed_at DATETIME2(3) NOT NULL CONSTRAINT DF_user_status_history_changed_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_user_status_history_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id),
  CONSTRAINT FK_user_status_history_users_changed_by FOREIGN KEY (changed_by) REFERENCES dbo.users(id)
);
GO

CREATE INDEX IX_user_status_history_user_changed_at ON dbo.user_status_history(user_id, changed_at DESC);
CREATE INDEX IX_user_status_history_changed_by ON dbo.user_status_history(changed_by);
GO

-- tests (legacy-compatible minimal schema)
CREATE TABLE dbo.tests (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  title NVARCHAR(200) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_tests_is_active DEFAULT 1,
  created_at DATETIME2(3) NOT NULL CONSTRAINT DF_tests_created_at DEFAULT SYSUTCDATETIME()
);
GO

-- test_completions (legacy-compatible minimal schema)
CREATE TABLE dbo.test_completions (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  test_id INT NOT NULL,
  user_id INT NOT NULL,
  completed_at DATETIME2(3) NULL,
  score DECIMAL(5,2) NULL,
  CONSTRAINT FK_test_completions_tests_test_id FOREIGN KEY (test_id) REFERENCES dbo.tests(id),
  CONSTRAINT FK_test_completions_users_user_id FOREIGN KEY (user_id) REFERENCES dbo.users(id)
);
GO

CREATE INDEX IX_test_completions_test_id ON dbo.test_completions(test_id);
CREATE INDEX IX_test_completions_user_id ON dbo.test_completions(user_id);
CREATE INDEX IX_test_completions_completed_at ON dbo.test_completions(completed_at);
GO
