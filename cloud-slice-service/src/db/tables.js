const enableUuidExtension = require('../config/uuidenable');
const pool = require('../db/dbconfig')

enableUuidExtension();

const createTables = async () => {
    try {
        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS cloudSliceLab (
             labId UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
             createdAt TIMESTAMP DEFAULT NOW(),
             createdBy UUID NOT NULL,
             services JSONB NOT NULL,
             region VARCHAR(255) NOT NULL,
             startDate TIMESTAMP NOT NULL,
             endDate TIMESTAMP NOT NULL,
             cleanupPolicy INT ,
             platform VARCHAR(255) NOT NULL,
             provider VARCHAR(255) NOT NULL,
             title VARCHAR(255) NOT NULL,
             description TEXT NOT NULL,
             difficultyLevel INT NOT NULL,
             status VARCHAR(255) NOT NULL,
             rating INT NOT NULL,
             modules TEXT Not NULL,
             credits INT,
             accounttype TEXT NOT NULL,
             foreign key (createdBy) references users(id) on delete cascade
            )
            `
        )

        //create a table for cloudslice organization assignment
        await pool.query(`
           CREATE TABLE IF NOT EXISTS cloudsliceorgassignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    labid UUID NOT NULL,
    orgid UUID NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (labid) REFERENCES cloudslicelab(labid),
    FOREIGN KEY (orgid) REFERENCES organizations(id)
);

 `)

        //create a table for cloudslice user assignment
        await pool.query(`
            create table if not exists cloudsliceuserassignment(
            id uuid PRIMARY KEY NOT NULL default uuid_generate_v4(),
            labid uuid,
            user_id uuid,
            assigned_by uuid,
            assigned_at TIMESTAMP default NOW(),
            status TEXT default 'pending',
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            launched boolean default false,
            isrunnig boolean default false,
            foreign key (labid) references cloudslicelab(labid)
        )
            `)

           await pool.query(` create table if not exists cloudsliceusermodulestatus(
                id uuid Primary key default uuid_generate_v4(),
                user_id uuid,
                labid uuid,
                module_id uuid,
                status TEXT default 'not-started'
               );`)

           await pool.query(`
               create table if not exists cloudsliceuserlabexercisestatus(
               id uuid primary key default uuid_generate_v4(),
               module_id uuid,
               exercise_id uuid,
               isrunning boolean default false,
               status TEXT default 'not-started'
               );`)

              await pool.query(`
               create table if not exists cloudsliceuserquizexercisestatus(
               id uuid primary key default uuid_generate_v4(),
               module_id uuid,
               exercise_id uuid,
               user_id uuid,
               total_questions INTEGER,
               correct INTEGER,
               incorrect INTEGER,
               score Integer,
               status TEXT default 'not-started'
               );`)

               //table for purchased labs
             await pool.query(`
              create table if not exists cloudslice_purchased_labs(
                        id uuid primary key default uuid_generate_v4(),
                        labid uuid,
                        user_id uuid,
                        assigned_at timestamp default NOW(),
                        status text default 'not-started',
                        start_date timestamp,
                        end_date timestamp,
                        launched boolean default false,
                        isrunning boolean default false,
                        username text,
                        password text,
                        console_url text,
                        duration text,
                        payment_id uuid references payments(id)
                    )
                `)
        //Reviews Table
        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS reviews (
            id uuid PRIMARY KEY default uuid_generate_v4(),
            lab_id uuid,
            user_id uuid,
            rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), -- star rating
            review_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
            `
        )
        //create a table for cloudvm aws purchased labs
        await pool.query(`
                create table if not exists cloudvm_aws_purchased_labs(
                id uuid primary key default uuid_generate_v4(),
                lab_id uuid,
                user_id uuid,
                status text default 'not-started',
                start_date timestamp,
                completion_date timestamp,
                duration integer,
                launched boolean default false,
                purchased boolean default false,
                assigned_at timestamp default timestamp,
                payment_id uuid
                )  
            `)

        //create a table for cloudslicelab with modules
        // await pool.query(`
        //     CREATE TABLE IF NOT EXISTS cloudSliceLabWithModules (
        //      labId UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        //      createdAt TIMESTAMP DEFAULT NOW(),
        //      createdBy UUID NOT NULL,
        //      region VARCHAR(255) NOT NULL,
        //      startDate TIMESTAMP NOT NULL,
        //      endDate TIMESTAMP NOT NULL,
        //      cleanupPolicy INT NOT NULL,
        //      platform VARCHAR(255) NOT NULL,
        //      provider VARCHAR(255) NOT NULL,
        //      title VARCHAR(255) NOT NULL,
        //      description TEXT NOT NULL,
        //      difficultyLevel INT,
        //      status VARCHAR(255) NOT NULL,
        //      rating INT ,
        //      modules TEXT Not NULL,
        //      foreign key (createdBy) references users(id) on delete cascade)
        //     `)

            // -- MODULES TABLE
        await pool.query(`CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lab_id UUID REFERENCES cloudSliceLab(labId) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`)

// -- EXERCISES TABLE
    await pool.query(`CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('lab', 'quiz')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)

// -- LAB EXERCISE TABLE
    await pool.query(`CREATE TABLE IF NOT EXISTS lab_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID UNIQUE REFERENCES exercises(id) ON DELETE CASCADE,
    estimated_duration INT, -- in minutes
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
	services TEXT[],
	files TEXT[] ,
    cleanuppolicy JSONB
);`)

// -- QUIZ QUESTIONS TABLE
    await pool.query(`CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    question_text TEXT NOT NULL,
	description TEXT,
	correct_answet TEXT,
    title TEXT,
    estimated_duration INT
);
`)

// -- OPTIONS TABLE
    await pool.query(`CREATE TABLE IF NOT EXISTS options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE
);`)


        console.log('cloudSlice tables created successfully!');


    } catch (error) {
        console.error('Error creating tables:', error);
        
    }
}

createTables();

module.exports = createTables