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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP),
                `
              
        );
        //single-vm datacenter table
        await pool.query(`
          create table if not exists singlevmdatacenter_lab(
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
      //template id information
      await pool.query(`
        CREATE TABLE IF NOT EXISTS templateinformation (
          labid UUID REFERENCES singlevmproxmox_lab(labid) ON DELETE CASCADE,
          templateid INTEGER ,
          created_at TIMESTAMP DEFAULT NOW(),
          processing boolean default false
        );
        `)
      //singlevm proxmox org table
      await pool.query(
        `
        CREATE TABLE IF NOT EXISTS singlevmproxmoxorgassignment (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        labid UUID REFERENCES singlevmproxmox_lab(labid) ON DELETE CASCADE,
        orgid UUID,
        assigned_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'available',
        startdate TIMESTAMP,
        enddate TIMESTAMP,
        user_id UUID,
        islaunched BOOLEAN DEFAULT FALSE,
        isrunning BOOLEAN DEFAULT FALSE,
        isprocessing BOOLEAN DEFAULT FALSE,
        vm_id INTEGER,
        vmname TEXT,
        assigned_by uuid
      );
      `
      )

      //single vm proxmox user assignment
      await pool.query(
        `
        create table if not exists singlevmproxmoxuserassignment(
        id uuid primary key,
        labid uuid,
        user_id uuid,
        assigned_by uuid,
        assigned_at timestamp default now(),
        startdate timestamp,
        enddate timestamp,
        islaunched boolean default false,
        isrunning boolean default false,
        isprocessing boolean default false,
        vmid integer,
        vmname text
        )
        `
      )
      //create batch table
      await pool.query(`
         create table if not exists batches(
          id uuid primary key default uuid_generate_v4(),
          name text,
          description text,
          created_at timestamp default NOW(),
          created_by uuid,
          user_count integer,
          lab_count integer,
          trainer_count integer,
          startdate timestamp,
          enddate timestamp
          )
        `)

        //create batch users
        await pool.query(`
         create table if not exists batch_users(
          id uuid primary key default uuid_generate_v4(),
          labs_started integer,
          labs_completed integer,
          total_labs integer,
          batch_id uuid,
          user_id uuid
          ) 
          `)
        
        //create batch labs
        await pool.query(`
        CREATE TABLE IF NOT EXISTS batchlabs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        lab_id UUID NOT NULL,
        lab_name TEXT NOT NULL,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        users_started INTEGER DEFAULT 0,
        users_completed INTEGER DEFAULT 0,
        total_users INTEGER DEFAULT 0,
        remaining_days INTEGER DEFAULT 0,
        trainer_id UUID,
        trainer_name TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        batch_id uuid,
        assigned_by uuid
      );
 `)

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

        //create a table for email verification code
        await pool.query(`
          CREATE TABLE IF NOT EXISTS email_verification_code (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) NOT NULL,
            verification_code VARCHAR(6) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL
          );
        `);

        //create the table to store the organization cloud credentials
        await pool.query(`
         CREATE TABLE IF NOT EXISTS org_cloud_credentials (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
              provider TEXT NOT NULL,
              name TEXT NOT NULL,
              credentials JSONB NOT NULL,
              created_by UUID,
              created_at TIMESTAMP DEFAULT NOW()
          );

          `)

           //create the table to store the organization cloud credentials
        await pool.query(`
          CREATE TABLE IF NOT EXISTS global_cloud_credentials (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              provider TEXT NOT NULL,
              name TEXT NOT NULL,
              credentials JSONB NOT NULL,
              created_by UUID,
              created_at TIMESTAMP DEFAULT NOW()
          );

          `)

        //create a table for cart_items
        await pool.query(`
                  CREATE TABLE IF NOT EXISTS cart_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          labid UUID NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          duration TEXT,
          price TEXT NOT NULL,
          quantity TEXT DEFAULT '1',
          user_id UUID NOT NULL,
          added_at TIMESTAMP DEFAULT NOW()
        );
    `)
    //store the cart data
    await pool.query(`
        CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        cart_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
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
      //create table for notifications
        await pool.query(`
          CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          type TEXT NOT NULL, 
          title TEXT NOT NULL,
          message TEXT,
          priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id UUID,
          metadata TEXT[],
          email_sent BOOLEAN DEFAULT false
          );
        `);

      await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
          ON notifications(user_id);
      `);
      //type of notification which is triggered for the lab
      await pool.query(`
                CREATE TABLE IF NOT EXISTS lab_notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            lab_id UUID NOT NULL,
            notification_type TEXT NOT NULL, -- e.g., 'expiry', 'maintenance'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expiry_date TIMESTAMP,
            notification_id uuid
        );

        `)
        //notification settings for user
        await pool.query(`
          CREATE TABLE IF NOT EXISTS user_notification_settings (
          user_id           UUID PRIMARY KEY,
          emailnotifications TEXT[],
          inappnotifications TEXT[], 
          email_digest      TEXT NOT NULL CHECK (email_digest IN ('immediate','hourly','daily','weekly','never')) DEFAULT 'immediate',
          quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
          quiet_start       TIME,      -- e.g., '22:00'
          quiet_end         TIME,      -- e.g., '08:00'
          timezone          TEXT NOT NULL DEFAULT 'Asia/Kolkata',
          daily_send_hour   SMALLINT NOT NULL DEFAULT 8,  -- local hour to send daily/weekly digests (0–23)
          weekly_send_day   SMALLINT NOT NULL DEFAULT 1   -- 1=Mon ... 7=Sun (ISO)
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

      //single vm proxmox purchased labs
      await pool.query(
        `
        CREATE TABLE IF NOT EXISTS singlevmproxmox_purchased_labs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        labid UUID,
        assigned_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'not-started',
        startdate TIMESTAMP,
        enddate TIMESTAMP,
        duration INTEGER,
        payment_id UUID,
        user_id UUID,
        vmid INTEGER,
        vmname TEXT,
        islaunched boolean default false,
        isrunning boolean default false
    );

        `
      
      )

        console.log(`Successfully created tables`);

    } catch (error) {
       console.log("Error in creating tables:",error.message);
    }
}
createTables();

module.exports = createTables;