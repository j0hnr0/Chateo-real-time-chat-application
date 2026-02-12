import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const users = [
  { phoneNumber: "+1234567001", firstName: "Alice", lastName: "Johnson" },
  { phoneNumber: "+1234567002", firstName: "Bob", lastName: "Smith" },
  { phoneNumber: "+1234567003", firstName: "Charlie", lastName: "Brown" },
  { phoneNumber: "+1234567004", firstName: "Diana", lastName: "Lee" },
  { phoneNumber: "+1234567005", firstName: "Ethan", lastName: "Garcia" },
  { phoneNumber: "+1234567006", firstName: "Fiona", lastName: "Chen" },
  { phoneNumber: "+1234567007", firstName: "George", lastName: "Kim" },
  { phoneNumber: "+1234567008", firstName: "Hannah", lastName: "Patel" },
  { phoneNumber: "+1234567009", firstName: "Isaac", lastName: "Nguyen" },
  { phoneNumber: "+1234567010", firstName: "Julia", lastName: "Martinez" },
];

async function main() {
  console.log("Seeding users...");

  for (const user of users) {
    await prisma.user.upsert({
      where: { phoneNumber: user.phoneNumber },
      update: {},
      create: user,
    });
  }

  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
