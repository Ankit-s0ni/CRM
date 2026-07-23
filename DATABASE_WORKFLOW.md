# Oazri Database Migration Workflow

Our database migration process has been updated! We no longer use raw SQL files in the custom `/migrations/` folder. Instead, we now use the industry-standard **Prisma Migrate** to keep our database schema and TypeScript codebase in perfect sync.

This guide outlines the standard workflow for adding new tables, columns, or relations to the database.

---

## 1. Make Changes Locally (Development)

Whenever you need to change the database schema, do it in these two steps:

1. **Edit `prisma/schema.prisma`**
   Add your new models, fields, or relations directly into the schema file. Never do this via raw SQL or manual database tools.
2. **Generate the Migration**
   Run the following command in the `oazri_backend` folder, giving your migration a descriptive name:

   ```bash
   npx prisma migrate dev --name <describe_your_change_here>
   ```

   *Example: `npx prisma migrate dev --name add_user_avatar`*

   **What this does automatically:**

   - Compares your updated `schema.prisma` against your local database.
   - Generates the exact SQL needed for the changes into a new folder inside `prisma/migrations/`.
   - Safely applies those SQL changes to your local database.
   - Generates the new Prisma TypeScript client types automatically.
3. **Commit Your Code**
   Stage the generated `prisma/migrations` folder and the updated `schema.prisma` file, then push it to Git.

---

## 2. Deploy to Production

When your code hits the production server, the schema changes need to be applied safely. This happens automatically by letting Prisma do the heavy lifting!

Run these steps in exact order on the production server (in the `oazri_backend` folder):

1. **Deploy Migrations:**

   ```bash
   npx prisma migrate deploy
   ```

   *(Prisma checks its internal tracking table on the prod database and applies ONLY the new SQL migrations it hasn't seen before. It will never drop or overwrite existing tables unless you explicitly removed them.)*
2. **Generate the Prod TypeScript Client:**

   ```bash
   npx prisma generate
   ```

   *(This updates the `node_modules/@prisma/client` folder on production so the Node.js code knows about your new database fields).*
3. **Build the Code:**

   ```bash
   npm run build
   ```
4. **Restart the Server Process:**
   Restart your backend service (e.g., via `pm2` or `systemd`) to load the newly compiled files.

---

### Important Notes

- **Never edit a migration file manually** after it has been created and committed!
- Do not run `npx prisma migrate dev` on the production server. Always use `deploy`.
- Remember to run `npx prisma generate` after `migrate deploy` before you build!
