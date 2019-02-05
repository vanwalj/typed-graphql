type Thunk<T> = T | Promise<T>;

type Object_<Source, Context> = {
  name: string;
  fields:
    | (() => Array<Field<Source, any, Context, any>>)
    | Array<Field<Source, any, Context, any>>;
};

type Union<Source, Context> = {
  types: Array<Object_<Source, Context>>;
  resolveType: (value: unknown) => Object_<Source, Context>;
};

type Scalar<Source> = {
  name: string;
  coerce: (output: Source) => string | number | boolean;
};

type Enum<Source> = {
  name: string;
  values: Source[];
};

type Type<Source, Context> =
  | {
      type: "Object";
      object: Object_<Source, Context>;
    }
  | {
      type: "Union";
      union: Union<Source, Context>;
    }
  | {
      type: "Scalar";
      scalar: Scalar<Source>;
    }
  | { type: "Enum"; enum: Enum<Source> }
  | { type: "NonNullable"; output: Type<NonNullable<Source>, Context> }
  | { type: "List"; output: Type<Source[] | null, Context> };

type Resolver<Source, Args extends any[], Context, Output> = (
  source: Source,
  context: Context,
  ...args: Args
) => Thunk<Output>;

type BoxedArg<T> = { [P in keyof T]: Arg<T[P]> };
type Field<Source, Args extends any[], Context, Output> = {
  name: string;
  args: BoxedArg<Args>;
  type: Type<Output, Context>;
  resolve: Resolver<Source, Args, Context, Output>;
};

type Arg<Source> = {
  type: "Scalar";
  name: string;
  scalar: { name: string; coerce: (input: unknown) => Source };
};

const ScalarArg = <Source>(
  name: string,
  coerce: (input: unknown) => Source
) => (argName: string) =>
  ({ type: "Scalar", scalar: { name, coerce } } as Arg<Source>);

const IntArg = ScalarArg("Int", input => 32);
const StringArg = ScalarArg("String", input => "32");

const Object_ = <Source, Context>({
  fields,
  name
}: {
  fields: () => Array<Field<Source, any, Context, any>>;
  name: string;
}) =>
  ({ type: "Object", object: { fields, name } } as Type<
    Source | null,
    Context
  >);

const Scalar = <T>(name: string, coerce: (output: T) => any) =>
  ({
    type: "Scalar",
    scalar: {
      name,
      coerce
    }
  } as Type<T | null, any>);

const Int = Scalar("Int", (input: number) => input);
const Float = Scalar("Float", (input: number) => input);
const String_ = Scalar("String", (input: string) => input);
const Boolean_ = Scalar("Boolean", (input: boolean) => input);

const NonNullable = <T, Context>(t: Type<T, Context>) =>
  ({
    output: t,
    type: "NonNullable"
  } as Type<NonNullable<T>, Context>);

const List = <T, Context>(t: Type<T, Context>) =>
  ({
    output: t,
    type: "List"
  } as Type<T[] | null, Context>);

const Field = <Source, Args extends any[], Context, Output>({
  name,
  args,
  resolve,
  type
}: {
  name: string;
  args: BoxedArg<Args>;
  type: Type<Output, Context>;
  resolve: Resolver<Source, Args, Context, Output>;
}) => ({ name, type, resolve, args } as Field<Source, Args, Context, Output>);

type Schema<Context> = {
  queries: Array<Field<void, any, Context, any>>;
  mutations?: Array<Field<void, any, Context, any>>;
};

const Schema = <Context>({
  queries,
  mutations
}: {
  queries: Array<Field<void, any, Context, any>>;
  mutations?: Array<Field<void, any, Context, any>>;
}) => ({ queries, mutations } as Schema<Context>);

const Enum = <T>(values: T[]) =>
  ({ type: "Enum", enum: { values } } as Type<T | null, any>);

// Userland

type Ctx = {
  userId: string;
};

type Book = {
  id: string;
};

const bookObject = Object_({
  fields: () => [
    Field({
      name: "id",
      args: [],
      resolve: (src: Book) => {
        return src.id;
      },
      type: NonNullable(String_)
    })
  ],
  name: "Book"
});

type User = {
  firstName: string;
  lastName: string;
};

type UserType = "MORTAL" | "ADMIN";

const UserTypeEnum = Enum<UserType>(["MORTAL", "ADMIN"]);

const userObject = Object_({
  fields: () => [
    Field({
      name: "firstName",
      args: [],
      resolve: (src: User) => {
        return src.firstName;
      },
      type: NonNullable(String_)
    }),
    Field({
      name: "lastName",
      args: [],
      resolve: (src: User) => {
        return src.lastName;
      },
      type: NonNullable(String_)
    }),
    Field({
      name: "fullName",
      args: [],
      resolve: (src: User) => {
        return src.firstName + src.lastName;
      },
      type: NonNullable(String_)
    }),
    Field({
      name: "type",
      args: [],
      resolve: (_: User): UserType => {
        return "ADMIN";
      },
      type: UserTypeEnum
    }),
    Field({
      name: "book",
      args: [],
      resolve: (_: User) => {
        return Promise.resolve([{ id: "32" }]);
      },
      type: List(NonNullable(bookObject))
    })
  ],
  name: "User"
});

const schema = Schema({
  queries: [
    Field({
      name: "User",
      args: [IntArg("age"), StringArg("firstName")],
      resolve: (
        _source: void,
        _context: Ctx,
        _age: number,
        _firstName: string
      ) => {
        return { firstName: "Jordan", lastName: "Van Walleghem" };
      },
      type: NonNullable(userObject)
    })
  ]
});
