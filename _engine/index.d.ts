/**
 * The main module for Nexus framework.
 * @module nexus
 */
export interface NexusAPI {
  /**
   * Executes a function only in the client context.
   * Use this for UI logic, user interactions, and client side operations.
   * @param fn The function to execute if running in the client context.
   * @example
   * Nexus.client(() => {
   *   console.log('This only runs on the client');
   * });
   */
  client(fn: () => void): void;
  /**
   * Executes a function only in the server context.
   * Use this for data validation, database operations, and secure server side logic.
   * @param fn The function to execute if running in the server context.
   * @example
   * Nexus.server(() => {
   *   console.log('This only runs on the server');
   * });
   */
  server(fn: () => void): void;
  /**
   * Registers an event listener for the specified event.
   * @param eventName The name of the event to listen for.
   * @param callback The callback function to execute when the event is emitted.
   * @example
   * Nexus.on<string>('playerJoined', (playerId) => {
   *   console.log(`Player joined: ${playerId}`);
   * });
   */
  on<T = any>(eventName: string, callback: (data: T) => void): void;
  /**
   * Emits an event with optional data.
   * @param eventName The name of the event to emit.
   * @param data Optional data to pass with the event.
   * @example
   * Nexus.emit<{ playerId: string }>('playerJoined', { playerId: '12345' });
   */
  emit<T = any>(eventName: string, data?: T): void;
  /**
   * Registers a server side RPC endpoint that can be called from the client.
   * Endpoints run only on the server and are used for secure operations like database access.
   * @param name The unique name identifier for this endpoint.
   * @param handler The async function to handle the endpoint call. Receives arguments from the client.
   * @example
   * Nexus.server(() => {
   *   Nexus.endpoint('getUser', async (helixId, userId) => {
   *     const user = await Database.User.findOne({ where: { id: userId } });
   *     return user;
   *   });
   * });
   */
  endpoint<T extends any[], R>(
    name: string,
    handler: (...args: T) => R | Promise<R>
  ): void;
  /**
   * Calls a registered server endpoint from the client and returns the result.
   * @param name The name of the endpoint to call.
   * @param args Arguments to pass to the endpoint handler.
   * @returns A promise that resolves with the endpoint's return value.
   * @example
   * Nexus.client(async () => {
   *   const user = await Nexus.call('getUser', helixId, '12345');
   *   console.log(user);
   * });
   */
  call(name: string, ...args: any[]): Promise<any>;
  /**
   * Registers a callback for when a player joins the game.
   * Works in both client and server contexts, listening to the appropriate event.
   * @param callback Function called when a player joins.
   * @example
   * Nexus.playerJoined((playerId) => {
   *   console.log(`Player ${playerId} has joined`);
   * });
   */
  playerJoined(callback: (playerId: string) => void): void;
  /**
   * Player API for accessing player specific methods and data.
   */
  Player: PlayerAPI;
  /**
   * Inventory class for creating and managing inventory instances.
   */
  Inventory: InventoryAPI;
  /**
   * State API for managing global state storage.
   */
  State: StateAPI;
}

export interface PlayerAPI {
  /**
   * Registers a callback for when the player's health changes.
   * @param callback Function called with old health, new health, and metadata.
   * @example
   * Nexus.client(async () => {
   *   await Player.onHealthChanged((oldHealth, newHealth) => {
   *     console.log(`Health changed from ${oldHealth} to ${newHealth}`);
   *   });
   * });
   */
  onHealthChanged(
    callback: (
      /**
       * The player's old health value.
       */
      oldHealth: number,
      /**
       * The player's new health value.
       */
      newHealth: number,
    ) => void
  ): Promise<void>;
  /**
   * Gets the player's pawn (character) object.
   * @returns The player's pawn or null if not available.
   * @example
   * const pawn = Player.getPawn();
   * if (pawn) console.log(pawn.GetName());
   */
  getPawn(): any;
  /**
   * Gets the player controller.
   * @returns The player controller or null if not available.
   * @example
   * const controller = Player.getController();
   */
  getController(): any;
  /**
   * Gets the player's Helix ID.
   * @returns The Helix ID or null if not available.
   * @example
   * const id = Player.helixId();
   * console.log(`Player Helix ID: ${id}`);
   */
  helixId(): string | null;
  /**
   * Revives/respawns the player.
   * @example
   * Player.revive();
   */
  revive(): void;
  /**
   * Gets the cached character data for the current player.
   * @returns The character data or null if not available.
   * @example
   * const character = Player.data;
   * if (character) console.log(character.name);
   */
  readonly data: any;
  /**
   * Gets the cached character data (alias for Player.data).
   * @returns The character data or null if not available.
   * @example
   * const character = Player.getCharacter();
   */
  getCharacter(): any;
  /**
   * Fetches the character data from the global store.
   * @returns A promise that resolves to the character data or null.
   * @example
   * const character = await Player.fetchData();
   * console.log(character);
   */
  fetchData<T = any>(): Promise<T | null>;
  /**
   * Gets the character ID from the cached character data.
   * @returns The character ID or null.
   * @example
   * const charId = Player.characterId;
   */
  readonly characterId: number | null;
  /**
   * Sets the character data for the current player.
   * @param character The character data to set.
   * @example
   * Player.setCharacter({ id: 1, firstName: 'name', lastName: 'last', money: 5000 });
   */
  setCharacter<T = any>(character: T): void;
  /**
   * Clears the cached character data.
   * @example
   * Player.clearCache();
   */
  clearCache(): void;
}

export interface InventoryAPI {
  /**
   * Creates a new inventory instance.
   * @example
   * const inventory = new Nexus.Inventory();
   * inventory.add('pistol', 1);
   */
  new (): InventoryInstance;
}

export interface InventoryInstance {
  items: Record<string, number>;
  /**
   * Adds items to the inventory.
   * @param item The item name/key.
   * @param count The quantity to add (default: 1).
   * @example
   * inventory.add('bandage', 5);
   * inventory.add('phone');
   */
  add(item: string, count?: number): void;
  /**
   * Removes items from the inventory.
   * @param item The item name/key.
   * @param count The quantity to remove (default: 1).
   * @example
   * inventory.remove('bandage', 2);
   * inventory.remove('phone');
   */
  remove(item: string, count?: number): void;
}

export interface StateAPI {
  /**
   * Sets a value in the global state store.
   * @param key The state key.
   * @param val The value to store.
   * @example
   * Nexus.State.set('serverTime', '14:30');
   * Nexus.State.set('playersOnline', 42);
   */
  set<T = any>(key: string, val: T): void;
  /**
   * Gets a value from the global state store.
   * @param key The state key.
   * @returns The stored value.
   * @example
   * const serverTime = Nexus.State.get<string>('serverTime');
   * const playersOnline = Nexus.State.get<number>('playersOnline');
   */
  get<T = any>(key: string): T;
}

export interface DatabaseAPI {
  /**
   * Connects to the database using the provided configuration.
   * @param config Database connection configuration.
   * @param source Optional source identifier for logging.
   * @returns A promise that resolves to true if connection successful, false otherwise.
   * @example
   * const connected = await Database.connect({
   *   database: 'mydb',
   *   username: 'user',
   *   password: 'pass',
   *   host: 'localhost',
   *   dialect: 'mariadb'
   * });
   */
  connect(
    config: {
      /**
       * The database name.
       */
      database: string;
      /**
       * The username for the database connection.
       */
      username: string;
      /**
       * The password for the database connection.
       */
      password: string;
      /**
       * The host address for the database connection.
       */
      host: string;
      /**
       * The port number for the database connection (optional).
       */
      port?: number;
      /**
       * The database dialect to use.
       * Supported options: "mariadb", "postgres", "mysql", "sqlite"
       */
      dialect?: "mariadb" | "postgres" | "mysql" | "sqlite";
    },
    source?: string
  ): Promise<boolean>;
  /**
   * Disconnects from the database.
   * @example
   * await Database.disconnect();
   */
  disconnect(): Promise<void>;
  /**
   * Lists all tables in the database.
   * @returns A promise that resolves to an array of table names.
   * @example
   * const tables = await Database.listTables();
   * console.log(tables);
   */
  listTables(): Promise<string[]>;
  /**
   * Defines a Sequelize model.
   * @param name The model name.
   * @param schema The model schema using Sequelize DataTypes.
   * @param options Additional Sequelize model options.
   * @returns The defined model.
   * @example
   * Database.defineModel('Character', {
   *   id: { type: Database.DataTypes.INTEGER, primaryKey: true },
   *   firstName: Database.DataTypes.STRING,
   *   lastName: Database.DataTypes.STRING,
   *   money: Database.DataTypes.INTEGER
   * });
   */
  defineModel(name: string, schema: any, options?: any): any;
  /**
   * Synchronizes all models with the database.
   * @param force If true, drops existing tables before recreating (default: false).
   * @example
   * await Database.sync();
   * await Database.sync(true);
   */
  sync(force?: boolean): Promise<void>;
  /**
   * Creates a new record in a model.
   * @param model The model name.
   * @param data The data for the new record.
   * @returns A promise that resolves to the created record.
   * @example
   * const character = await Database.create('Character', {
   *   firstName: 'name',
   *   lastName: 'last',
   *   money: 5000
   * });
   */
  create<T = any>(model: string, data: any): Promise<T>;
  /**
   * Finds a single record matching the where clause.
   * @param model The model name.
   * @param where The where clause.
   * @returns A promise that resolves to the found record or null.
   * @example
   * const character = await Database.findOne('Character', { id: 1 });
   */
  findOne<T = any>(model: string, where: any): Promise<T | null>;
  /**
   * Finds all records matching the where clause.
   * @param model The model name.
   * @param where The where clause (default: {}).
   * @param options Additional query options.
   * @returns A promise that resolves to an array of records.
   * @example
   * const characters = await Database.findAll('Character', { helixId: 'abc123' });
   * const limitedChars = await Database.findAll('Character', {}, { limit: 10 });
   */
  findAll<T = any>(model: string, where?: any, options?: any): Promise<T[]>;
  /**
   * Updates records matching the where clause.
   * @param model The model name.
   * @param values The values to update.
   * @param where The where clause.
   * @returns A promise that resolves to the number of affected rows.
   * @example
   * await Database.update('Character', { money: 10000 }, { id: 1 });
   */
  update(model: string, values: any, where: any): Promise<any>;
  /**
   * Removes records matching the where clause.
   * @param model The model name.
   * @param where The where clause.
   * @returns A promise that resolves to the number of deleted rows.
   * @example
   * await Database.remove('Character', { id: 1 });
   */
  remove(model: string, where: any): Promise<any>;
  /**
   * Executes a raw SQL query.
   * @param sql The SQL query string.
   * @param replacements Optional query parameter replacements.
   * @returns A promise that resolves to the query results.
   * @example
   * const results = await Database.raw(
   *   'SELECT * FROM characters WHERE money > :amount',
   *   { amount: 10000 }
   * );
   */
  raw<T = any>(sql: string, replacements?: any): Promise<T[]>;
  /**
   * Sequelize DataTypes for model definitions.
   * @example
   * Database.DataTypes.STRING
   * Database.DataTypes.INTEGER
   * Database.DataTypes.BOOLEAN
   */
  DataTypes: any;
  /**
   * Sequelize operators for complex queries.
   * @example
   * Database.findAll('Character', { money: { [Database.Op.gt]: 5000 } });
   */
  Op: any;
}

/**
 * WebUI class for creating and managing web based UIs.
 * @example
 * const ui = new WebUI('MainMenu', '/Game/UI/MainMenu', 0);
 * ui.SendEvent('show', { player: 'name' });
 */
export interface WebUIConstructor {
  new (name: string, path: string, inputMode?: number): WebUIInstance;
}

export interface WebUIInstance {
  Name: string;
  Events: Record<string, Function>;
  Widget: any;
  Host: any;
  /**
   * Sends an event to the UI with optional payload.
   * @param name The event name.
   * @param payload The data payload to send.
   * @example
   * ui.SendEvent('updateScore', { score: 100 });
   */
  SendEvent<T = any>(name: string, payload?: T): void;
  /**
   * Registers a handler for UI events.
   * @param name The event name.
   * @param fn The handler function that receives data and a callback function.
   * @example
   * ui.RegisterEventHandler('buttonClicked', (data, callback) => {
   *   console.log('Button clicked:', data);
   *   callback({ success: true });
   * });
   */
  RegisterEventHandler<T = any, R = any>(
    name: string,
    fn: (data: T, callback: (...args: R[]) => void) => void
  ): void;
  /**
   * Brings the UI to the front of the rendering stack.
   * @example
   * ui.BringToFront();
   */
  BringToFront(): void;
  /**
   * Sets the input mode for this UI.
   * @param mode The input mode (0 = UI Only, 1 = Game and UI, 2 = Game Only).
   * @example
   * ui.SetInputMode(1);
   */
  SetInputMode(mode: number): void;
  /**
   * Destroys the UI widget.
   * @example
   * ui.Destroy();
   */
  Destroy(): void;
}

/**
 * Global declarations for Nexus framework.
 */
declare global {
  /**
   * The Nexus framework API.
   */
  const Nexus: NexusAPI;
  /**
   * Unreal Engine API.
   */
  const UE: any;
  /**
   * Puerts API.
   */
  const puerts: any;
  /**
   * WebUI class for creating and managing web based UIs.
   * @example
   * const ui = new WebUI('MainMenu', 'path/to/ui.html', 0);
   */
  const WebUI: WebUIConstructor;
  /**
   * Input API for handling user input.
   */
  const Input: any;
  /**
   * Player API for accessing player specific methods and data.
   */
  const Player: PlayerAPI;
  /**
   * State API for managing global state storage.
   */
  const Database: DatabaseAPI;
}
