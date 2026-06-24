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
        //create table for global cloud
        await pool.query(`
              CREATE TABLE IF NOT EXISTS global_cloud_credentials (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              provider TEXT NOT NULL,
              name TEXT NOT NULL,
              credentials JSONB NOT NULL,
              created_by UUID,
              created_at TIMESTAMPTZ DEFAULT NOW(),
			        updated_at TIMESTAMPTZ
          );
          `)
        //create the lab_extension_request
        await pool.query(`
           CREATE TABLE IF NOT EXISTS lab_extension_requests (
                  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                  purchased_id UUID,
                  lab_id UUID,
                  lab_title TEXT,
                  org_id UUID,
                  org_name TEXT,
                  admin_id UUID,
                  admin_name TEXT,
                  additional_days INTEGER,
                  additional_users INTEGER,
                  reason TEXT,
                  requested_at TIMESTAMPTZ DEFAULT NOW(),
                  status TEXT DEFAULT 'pending',
                  admin_note TEXT
            );
          `)

          //single vm datacenter user purchase labs
          await pool.query(`
             CREATE TABLE IF NOT EXISTS singlevmdatacenter_purchased (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                labid uuid,
                user_id uuid,
                assigned_by uuid,
                assigned_at TIMESTAMPTZ DEFAULT NOW(),
                status TEXT DEFAULT 'not-started',
                startdate TIMESTAMPTZ DEFAULT NOW(),
                enddate TIMESTAMPTZ,
                isrunning BOOLEAN,
                creds_id uuid,
                payment_id uuid,
                duration INTEGER
            );
            `)

            //license key table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS license_keys (
                  id TEXT PRIMARY KEY,
                  license_key TEXT UNIQUE NOT NULL,
                  
                  org_id TEXT NOT NULL,
                  org_name TEXT,
                  
                  plan_tier TEXT NOT NULL,
                  plan_name TEXT NOT NULL,
                  
                  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')),
                  
                  status TEXT CHECK (status IN ('active', 'expired', 'cancelled')),
                  
                  issued_at DATE NOT NULL,
                  expires_at DATE NOT NULL,
                  
                  features JSONB NOT NULL, -- snapshot of plan at purchase time
                  usage JSONB,
                  
                  created_at TIMESTAMP DEFAULT NOW()
              );  
              `)

            //user session table
            await pool.query(`
              create table user_sessions(
                id uuid primary key default uuid_generate_v4(),
                labid uuid,
                user_id uuid,
                starttime Timestamptz,
                endtime Timestamptz,
                isactive boolean default false,
                type TEXT,
                instance_id TEXT,
                node TEXT
              )
              `)

            //user credits table
            await pool.query(`
              CREATE TABLE user_credits (
              id uuid PRIMARY KEY default uuid_generate_v4(),
              user_id uuid,
              labid uuid,
              total_minutes INT ,
              remaining_minutes INT ,
              updated_at TIMESTAMPTZ DEFAULT NOW()
          );
              `)

            //create vmcluster purchased for user
            await pool.query(`
              CREATE TABLE IF NOT EXISTS vmclusterdatacenter_purchased (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                labid uuid,
                user_id uuid
                assigned_by uuid,
                status text DEFAULT 'not-started',
                startdate timestamptz,
                enddate timestamptz,
                isrunning boolean DEFAULT false,
                group_creds_id uuid,
                assigned_at timestamptz DEFAULT NOW(),
                assignment_type text,
                batch_id uuid,
                purchased boolean default false,
                purchased_id uuid
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
    );`)
    //purchased singlevm aws lab
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lab_batch_purchased (
    purchased_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    lab_id UUID NOT NULL,
    admin_id UUID NOT NULL,       
    org_id UUID NOT NULL,
    org_name TEXT,

    configured_by UUID,     

    number_of_days INTEGER NOT NULL CHECK (number_of_days > 0),
    number_of_users INTEGER NOT NULL CHECK (number_of_users > 0),
    assigned_users INTEGER DEFAULT 0 CHECK (assigned_users >= 0),

    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ NOT NULL,

    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'pending')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      `)

        // ── PROXMOX CLUSTER LAB TABLES ─────────────────────────────────────────
        // The cluster lab record
        await pool.query(`
            CREATE TABLE IF NOT EXISTS proxmoxcluster_lab (
                labid               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id             UUID NOT NULL,
                title               TEXT NOT NULL,
                description         TEXT,
                status              TEXT DEFAULT 'available',
                startdate           TIMESTAMP,
                enddate             TIMESTAMP,
                labguide            TEXT[],
                userguide           TEXT[],
                software            TEXT[],
                credential_id       UUID,
                cataloguetype       TEXT DEFAULT 'private',
                remaining           INTEGER DEFAULT -1,
                learning_objectives TEXT,
                prerequisites       TEXT,
                target_audience     TEXT,
                key_technologies    TEXT[],
                additional_details  TEXT,
                guacamole_name      TEXT,
                guacamole_url       TEXT,
                created_at          TIMESTAMP DEFAULT NOW()
            );
        `);
        // VM template configs that make up one cluster (admin defines at creation time)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS proxmoxcluster_vm_configs (
                id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                lab_id        UUID NOT NULL REFERENCES proxmoxcluster_lab(labid) ON DELETE CASCADE,
                vm_label      TEXT NOT NULL,
                node          TEXT NOT NULL,
                template_id   INTEGER NOT NULL,
                cpu           INTEGER DEFAULT 2,
                ram           INTEGER DEFAULT 2048,
                storage       INTEGER DEFAULT 50,
                storagetype   TEXT DEFAULT 'local-lvm',
                networkbridge TEXT DEFAULT 'vmbr0',
                nicmodel      TEXT DEFAULT 'virtio',
                protocol      TEXT DEFAULT 'RDP',
                username      TEXT,
                password      TEXT,
                created_at    TIMESTAMP DEFAULT NOW()
            );
        `);

        // Org-level assignment
        await pool.query(`
            CREATE TABLE IF NOT EXISTS proxmoxcluster_org_assignment (
                id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                labid       UUID NOT NULL,
                orgid       UUID NOT NULL,
                assigned_by UUID,
                startdate   TIMESTAMP,
                enddate     TIMESTAMP,
                status      TEXT DEFAULT 'available',
                purchased   BOOLEAN DEFAULT false,
                purchased_id UUID,
                assigned_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // One row per user per lab assignment
        await pool.query(`
            CREATE TABLE IF NOT EXISTS proxmoxcluster_user_assignment (
                id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                labid           UUID NOT NULL,
                user_id         UUID NOT NULL,
                assigned_by     UUID,
                startdate       TIMESTAMP,
                enddate         TIMESTAMP,
                status          TEXT DEFAULT 'not-started',
                isrunning       BOOLEAN DEFAULT false,
                assignment_type TEXT DEFAULT 'direct',
                batch_id        UUID,
                assigned_at     TIMESTAMP DEFAULT NOW()
            );
        `);

        // One row per VM per user – filled when templates are cloned on Proxmox
        await pool.query(`
            CREATE TABLE IF NOT EXISTS proxmoxcluster_user_vms (
                id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                assignment_id  UUID NOT NULL REFERENCES proxmoxcluster_user_assignment(id) ON DELETE CASCADE,
                labid          UUID NOT NULL,
                user_id        UUID NOT NULL,
                vm_config_id   UUID NOT NULL REFERENCES proxmoxcluster_vm_configs(id),
                vm_label       TEXT,
                proxmox_vmid   INTEGER,
                vmname         TEXT,
                node           TEXT,
                protocol       TEXT,
                username       TEXT,
                password       TEXT,
                ip             TEXT,
                port           TEXT,
                islaunched     BOOLEAN DEFAULT false,
                isrunning      BOOLEAN DEFAULT false,
                isprocessing   BOOLEAN DEFAULT false,
                created_at     TIMESTAMP DEFAULT NOW()
            );
        `);
        // Add catalogue fields (safe to run on existing tables)
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS cataloguename TEXT`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS catalogue_level TEXT`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS catalogue_category TEXT`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS catalogue_price NUMERIC(10,2)`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS number_hours_day INTEGER DEFAULT 1`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS templates_converted BOOLEAN DEFAULT false`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS learning_objectives TEXT`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS prerequisites TEXT`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS target_audience TEXT`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS key_technologies TEXT[]`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS additional_details TEXT`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS guacamole_name TEXT`);
        await pool.query(`ALTER TABLE proxmoxcluster_lab ADD COLUMN IF NOT EXISTS guacamole_url TEXT`);
        // ── END PROXMOX CLUSTER LAB TABLES ────────────────────────────────────
        
        await pool.query(`
          CREATE TABLE IF NOT EXISTS proxmox_cluster_purchased (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

            labid UUID NOT NULL
                REFERENCES proxmoxcluster_lab(labid) ON DELETE CASCADE,

            user_id UUID NOT NULL,
            lab_owner UUID NOT NULL,

            startdate TIMESTAMPTZ DEFAULT NOW(),
            enddate TIMESTAMPTZ,

            status TEXT DEFAULT 'not-started',
            isrunning BOOLEAN DEFAULT FALSE,

            purchased_at TIMESTAMPTZ DEFAULT NOW(),

            duration INTEGER,
            number_hours_day INTEGER,

            purchased BOOLEAN DEFAULT TRUE,

            payment_id UUID,

            created_at TIMESTAMPTZ DEFAULT NOW()
        ); 
          `)

        console.log(`Successfully created tables`);

    } catch (error) {
       console.log("Error in creating tables:",error.message);
    }
}
createTables();

module.exports = createTables;