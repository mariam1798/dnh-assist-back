exports.up = function (knex) {
  return knex.schema.createTable("blocked_dates", (table) => {
    table.increments("id").primary();
    table.date("date").notNullable();
    table.integer("booking_id").unsigned().notNullable();
    table
      .foreign("booking_id")
      .references("id")
      .inTable("bookings")
      .onDelete("CASCADE");
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("blocked_dates");
};
