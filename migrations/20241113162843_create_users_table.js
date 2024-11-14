exports.up = function (knex) {
  return knex.schema.createTable("users", (table) => {
    table.increments("id");
    table.string("name").notNullable(); // Ensure this line exists
    table.string("email").notNullable().unique();
    table.string("password").notNullable();
    table.string("role").notNullable();
    table.string("overview");
    table.string("avatar");
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("users");
};
