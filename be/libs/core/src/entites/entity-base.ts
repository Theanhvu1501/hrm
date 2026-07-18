// import {
//   Index,
//   PrimaryKey,
//   Property,
//   SerializedPrimaryKey,
//   types,
// } from '@mikro-orm/core';
// import { ObjectId } from '@mikro-orm/mongodb';

// export class EntityBase {
//   @PrimaryKey()
//   _id!: ObjectId;

//   @SerializedPrimaryKey()
//   id!: string;

//   @Index()
//   @Property({ onCreate: () => new Date() })
//   created: Date = new Date();

//   @Property({ type: types.boolean, default: false })
//   deleted!: boolean;

//   @Property({ onUpdate: () => new Date(), onCreate: () => new Date() })
//   modified: Date = new Date();
// }
