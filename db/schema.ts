// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const applications=sqliteTable('applications',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),citizenId:text('citizen_id').notNull(),name:text('name').notNull(),status:text('status').notNull().default('draft'),consent:integer('consent').notNull().default(1),expiresAt:text('expires_at').notNull(),scopes:text('scopes').notNull(),result:text('result'),email:text('email'),statement:text('statement'),createdAt:text('created_at').notNull(),submittedAt:text('submitted_at'),
},t=>[index('idx_applications_owner_created').on(t.owner,t.createdAt)]);
export const checks=sqliteTable('checks',{
 id:text('id').primaryKey(),applicationId:text('application_id').notNull().references(()=>applications.id),department:text('department').notNull(),raw:text('raw').notNull(),normalized:text('normalized').notNull(),checkedAt:text('checked_at').notNull(),
},t=>[uniqueIndex('idx_checks_application_department').on(t.applicationId,t.department)]);
export const audit=sqliteTable('audit',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),applicationId:text('application_id'),action:text('action').notNull(),department:text('department'),outcome:text('outcome').notNull(),details:text('details').notNull(),durationMs:integer('duration_ms'),createdAt:text('created_at').notNull(),
},t=>[index('idx_audit_owner_created').on(t.owner,t.createdAt)]);
