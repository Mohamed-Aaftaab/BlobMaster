module blobmaster::vault {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use std::string::{Self, String};
    use sui::clock::{Self, Clock};

    // ── Error codes ─────────────────────────────────────────────────────────────
    const EInsufficientFunds: u64 = 0;
    const ENotAuthorized:     u64 = 1;
    const EBadBlobId:         u64 = 2;
    const EVaultMismatch:     u64 = 3;
    const ETooSoon:           u64 = 4;
    const ERequestedRewardTooHigh: u64 = 5;

    // ── Structs (public required in Move 2024) ──────────────────────────────────

    public struct AdminCap has key, store { id: UID }

    public struct PriceOracle has key {
        id: UID,
        mist_per_epoch_per_megabyte: u64,
    }

    public struct Vault has key, store {
        id:      UID,
        owner:   address,
        balance: Coin<SUI>,
    }

    public struct AutopilotRule has key, store {
        id:                     UID,
        vault_id:               ID,
        blob_id:                String,
        renew_when_epochs_left: u64,
        epochs_to_add:          u64,
        max_price_per_epoch:    u64,
        keeper_reward:          u64,
        webhook_url:            String,
        blob_size_bytes:        u64,
        last_renewed_timestamp: u64, // using timestamp for precision
    }

    // ── Events ───────────────────────────────────────────────────────────────────

    public struct VaultCreated has copy, drop {
        vault_id: ID,
        owner:    address,
    }

    public struct Deposited has copy, drop {
        vault_id: ID,
        amount:   u64,
    }

    public struct Withdrawn has copy, drop {
        vault_id: ID,
        amount:   u64,
        to:       address,
    }

    public struct RuleCreated has copy, drop {
        rule_id:                ID,
        vault_id:               ID,
        blob_id:                String,
        renew_when_epochs_left: u64,
        epochs_to_add:          u64,
        max_price_per_epoch:    u64,
        keeper_reward:          u64,
        blob_size_bytes:        u64,
    }

    public struct RuleDeleted has copy, drop {
        rule_id: ID,
    }

    public struct BlobRenewed has copy, drop {
        rule_id:      ID,
        blob_id:      String,
        keeper:       address,
        storage_cost: u64,
        reward:       u64,
        epochs_added: u64,
    }

    // ── Init ────────────────────────────────────────────────────────────────────
    
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        transfer::public_transfer(admin_cap, ctx.sender());

        let oracle = PriceOracle {
            id: object::new(ctx),
            // Default 300,000 MIST (0.0003 SUI) per megabyte per epoch.
            mist_per_epoch_per_megabyte: 300_000, 
        };
        transfer::share_object(oracle);
    }

    public fun update_oracle_price(
        _: &AdminCap,
        oracle: &mut PriceOracle,
        new_price: u64
    ) {
        oracle.mist_per_epoch_per_megabyte = new_price;
    }

    // ── Vault functions ──────────────────────────────────────────────────────────

    public fun create_vault(ctx: &mut TxContext) {
        let vault = Vault {
            id:      object::new(ctx),
            owner:   ctx.sender(),
            balance: coin::zero<SUI>(ctx),
        };
        event::emit(VaultCreated {
            vault_id: object::id(&vault),
            owner:    ctx.sender(),
        });
        transfer::public_transfer(vault, ctx.sender());
    }

    public fun deposit(vault: &mut Vault, payment: Coin<SUI>, _ctx: &mut TxContext) {
        let amount = coin::value(&payment);
        coin::join(&mut vault.balance, payment);
        event::emit(Deposited { vault_id: object::id(vault), amount });
    }

    public fun withdraw(vault: &mut Vault, amount: u64, ctx: &mut TxContext) {
        assert!(ctx.sender() == vault.owner, ENotAuthorized);
        assert!(coin::value(&vault.balance) >= amount, EInsufficientFunds);
        let extracted = coin::split(&mut vault.balance, amount, ctx);
        event::emit(Withdrawn {
            vault_id: object::id(vault),
            amount,
            to: ctx.sender(),
        });
        transfer::public_transfer(extracted, ctx.sender());
    }

    public fun balance(vault: &Vault): u64 {
        coin::value(&vault.balance)
    }

    public fun owner(vault: &Vault): address {
        vault.owner
    }

    // ── Autopilot rule functions ──────────────────────────────────────────────────

    public fun register_autopilot(
        vault:                  &Vault,
        blob_id:                String,
        renew_when_epochs_left: u64,
        epochs_to_add:          u64,
        max_price_per_epoch:    u64,
        keeper_reward:          u64,
        webhook_url:            String,
        blob_size_bytes:        u64,
        clock:                  &Clock,
        ctx:                    &mut TxContext,
    ) {
        assert!(ctx.sender() == vault.owner, ENotAuthorized);
        assert!(string::length(&blob_id) >= 20, EBadBlobId);
        assert!(blob_size_bytes > 0, EBadBlobId); // just reuse error code

        let rule = AutopilotRule {
            id: object::new(ctx),
            vault_id: object::id(vault),
            blob_id,
            renew_when_epochs_left,
            epochs_to_add,
            max_price_per_epoch,
            keeper_reward,
            webhook_url,
            blob_size_bytes,
            last_renewed_timestamp: clock::timestamp_ms(clock),
        };

        event::emit(RuleCreated {
            rule_id:                object::id(&rule),
            vault_id:               object::id(vault),
            blob_id:                rule.blob_id,
            renew_when_epochs_left: rule.renew_when_epochs_left,
            epochs_to_add:          rule.epochs_to_add,
            max_price_per_epoch:    rule.max_price_per_epoch,
            keeper_reward:          rule.keeper_reward,
            blob_size_bytes:        rule.blob_size_bytes,
        });

        transfer::share_object(rule);
    }

    public fun delete_rule(rule: AutopilotRule, vault: &Vault, ctx: &mut TxContext) {
        assert!(ctx.sender() == vault.owner, ENotAuthorized);
        assert!(object::id(vault) == rule.vault_id, EVaultMismatch);
        let rule_id = object::id(&rule);
        let AutopilotRule {
            id,
            vault_id: _,
            blob_id: _,
            renew_when_epochs_left: _,
            epochs_to_add: _,
            max_price_per_epoch: _,
            keeper_reward: _,
            webhook_url: _,
            blob_size_bytes: _,
            last_renewed_timestamp: _,
        } = rule;
        object::delete(id);
        event::emit(RuleDeleted { rule_id });
    }

    public fun execute_renewal(
        oracle:           &PriceOracle,
        rule:             &mut AutopilotRule,
        vault:            &mut Vault,
        requested_reward: u64,
        clock:            &Clock,
        ctx:              &mut TxContext,
    ) {
        assert!(object::id(vault) == rule.vault_id, EVaultMismatch);
        assert!(requested_reward <= rule.keeper_reward, ERequestedRewardTooHigh);
        
        // Prevent instant draining: Must wait at least (epochs_to_add - renew_when_epochs_left) days
        // We assume 1 epoch roughly equals 1 day (86400000 ms) for anti-spam.
        let min_days_between = if (rule.epochs_to_add > rule.renew_when_epochs_left) {
            rule.epochs_to_add - rule.renew_when_epochs_left
        } else {
            1
        };
        let min_cooldown_ms = min_days_between * 86400000;
        let now = clock::timestamp_ms(clock);
        assert!(now >= rule.last_renewed_timestamp + min_cooldown_ms, ETooSoon);

        // Trustless on-chain storage cost calculation:
        let mbs = if (rule.blob_size_bytes < 1000000) { 1 } else { rule.blob_size_bytes / 1000000 };
        let storage_cost = mbs * oracle.mist_per_epoch_per_megabyte * rule.epochs_to_add;

        // Ensure we don't exceed the user's hard cap
        assert!(storage_cost <= rule.max_price_per_epoch * rule.epochs_to_add, EInsufficientFunds);

        let total = storage_cost + requested_reward;
        assert!(coin::value(&vault.balance) >= total, EInsufficientFunds);

        let keeper_payment = coin::split(&mut vault.balance, total, ctx);
        let keeper = ctx.sender();
        transfer::public_transfer(keeper_payment, keeper);

        rule.last_renewed_timestamp = now;

        event::emit(BlobRenewed {
            rule_id:      object::id(rule),
            blob_id:      rule.blob_id,
            keeper,
            storage_cost,
            reward:       requested_reward,
            epochs_added: rule.epochs_to_add,
        });
    }

    // ── View helpers ─────────────────────────────────────────────────────────────
    public fun rule_blob_id(rule: &AutopilotRule): &String     { &rule.blob_id }
    public fun rule_vault_id(rule: &AutopilotRule): &ID        { &rule.vault_id }
    public fun rule_renew_threshold(rule: &AutopilotRule): u64 { rule.renew_when_epochs_left }
    public fun rule_epochs_to_add(rule: &AutopilotRule): u64   { rule.epochs_to_add }
    public fun rule_keeper_reward(rule: &AutopilotRule): u64   { rule.keeper_reward }
    public fun rule_max_price(rule: &AutopilotRule): u64       { rule.max_price_per_epoch }
}
