exports.up = function (knex) {
  return knex.schema
    .createTable("available_slots", (table) => {
      table.increments("id").primary();
      table.date("date").notNullable();
      table.time("time").notNullable();
      table.boolean("is_booked").defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable("bookings", (table) => {
      table.increments("id").primary();
      table.string("dentist_name", 255).notNullable();
      table.string("patient_name", 255).notNullable(); // Added patient_name column
      table.string("email", 255).notNullable();
      table.string("phone", 20).notNullable();
      table.date("date").notNullable();
      table.time("time").notNullable();
      table.string("address").nullable(); // Added address column
      table.string("payment_id", 255).nullable(); // Added payment_id column
      table.string("payment_status", 50).notNullable().defaultTo("Pending");
      table.string("status").defaultTo("Active");
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("bookings")
    .dropTableIfExists("available_slots");
};
