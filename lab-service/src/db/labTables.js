const pool = require('../db/dbConfig');
const enableUuidExtension = require('../config/uuidEnable');

enableUuidExtension();

const createTables = async()=>{

    try {
        //creata a table to store lab details
        await pool.query(
            `CREATE TABLE IF NOT EXISTS createLab (
                lab_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255),
                description VARCHAR(255),
                duration VARCHAR(255),
                type TEXT,
                platform TEXT,
                provider VARCHAR(255),
                cpu NUMERIC(5),
                ram NUMERIC(5),
                storage NUMERIC(5),
                instance VARCHAR(255),
                snapshot_type VARCHAR(255) DEFAULT 'hibernate' CHECK (snapshot_type IN ('snapshot', 'hibernate')),
                os VARCHAR(255),
                os_version VARCHAR(255), 
                difficulty VARCHAR(50) DEFAULT 'beginner',
                status VARCHAR(50) DEFAULT 'available',
                rating FLOAT DEFAULT 0.0,
                total_enrollments INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
              
        );
        //single-vm datacenter table
        await pool.query(`
          create table if not exist singlevmdatacenter_lab(
          lab_id uuid primary key default uuid_generate_v4(),
          user_id uuid,
          title text,
          description text,
          type text,
          platform text,
          status text default 'pending',
          created_at timestamp default now(),
          labguide text[],
          userguide text[]
      )`)
      //lab_status  logs table
        await pool.query(`
                    CREATE TABLE IF NOT EXISTS lab_status_logs(
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              labid UUID ,
              lab_type TEXT,
              type TEXT,
              previous_status TEXT,
              new_status TEXT,
              changed_at TIMESTAMP DEFAULT NOW(),
              change_reason TEXT DEFAULT 'cron_job'
            );
        `)

        //single-vm lab progress table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS singlevm_lab_progress (
          user_id UUID PRIMARY KEY,
          step1 BOOLEAN DEFAULT false,
          step2 BOOLEAN DEFAULT false,
          step3 BOOLEAN DEFAULT false
           );  
          `)

        //lab configuration table

        await pool.query(
           ` CREATE TABLE IF NOT EXISTS lab_configurations (
                config_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                lab_id UUID NOT NULL REFERENCES createLab(lab_id) ON DELETE CASCADE,
                admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                config_details JSONB NOT NULL,
                configured_at TIMESTAMP DEFAULT NOW()
              );`
        );

        //orgnization assignment table
        await pool.query(
            `CREATE TABLE IF NOT EXISTS lab_batch (
        batch_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        lab_id UUID,
        admin_id UUID REFERENCES users(id),
        org_id UUID REFERENCES organizations(id),
        software TEXT[],
        config_details JSON,
        configured_by UUID REFERENCES users(id)
      );
    `
        )

        //labassignment table for users
        await pool.query(`CREATE TABLE IF NOT EXISTS LabAssignments (
        assignment_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        lab_id UUID NOT NULL REFERENCES createLab(lab_id),
        assigned_admin_id UUID NOT NULL REFERENCES users(id),
        user_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
        start_date TIMESTAMP DEFAULT NOW(),
        duration INT,
        completion_date TIMESTAMP,
        progress_percentage INT CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        remarks TEXT,
        launched BOOLEAN default false
      );`)

      //cloudassigned instance for users
      await pool.query(
        `CREATE TABLE IF NOT EXISTS cloudassignedinstance(
        id INT PRIMARY KEY,
        username TEXT,
        user_id uuid,
        instance_id TEXT,
        public_ip TEXT,
        instance_name TEXT,
        instance_type TEXT,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP default NOW(),
        password TEXT,
        lab_id UUID,
        isrunning boolean DEFAULT false,
        isstarted boolean DEFAULT false
        )`
      );

        console.log(`Successfully created tables`);

    } catch (error) {
       console.log("Error in creating tables:",error.message);
    }
}
createTables();

module.exports = createTables;