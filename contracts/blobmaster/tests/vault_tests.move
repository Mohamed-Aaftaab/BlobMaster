#[test_only]
module blobmaster::vault_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use std::string;
    use blobmaster::vault::{Self, Vault, AutopilotRule};

    const USER: address = @0x123;

    #[test]
    fun test_create_vault() {
        let mut scenario = test_scenario::begin(USER);
        
        vault::create_vault(test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, USER);
        
        let vault = test_scenario::take_from_sender<Vault>(&scenario);
        assert!(vault::balance(&vault) == 0, 0);
        assert!(vault::owner(&vault) == USER, 1);
        
        test_scenario::return_to_sender(&scenario, vault);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_deposit_and_withdraw() {
        let mut scenario = test_scenario::begin(USER);
        
        vault::create_vault(test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, USER);
        
        let mut vault = test_scenario::take_from_sender<Vault>(&scenario);
        let payment = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
        
        vault::deposit(&mut vault, payment, test_scenario::ctx(&mut scenario));
        assert!(vault::balance(&vault) == 1000, 0);
        
        vault::withdraw(&mut vault, 400, test_scenario::ctx(&mut scenario));
        assert!(vault::balance(&vault) == 600, 1);
        
        test_scenario::return_to_sender(&scenario, vault);
        test_scenario::end(scenario);
    }
}
