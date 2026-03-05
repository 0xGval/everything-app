use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoinInfo {
    pub name: String,
    pub sz_decimals: u32,
    pub mark_px: String,
    pub prev_day_px: String,
    pub day_ntl_vlm: String,
    pub funding: String,
    pub open_interest: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssetMeta {
    name: String,
    sz_decimals: u32,
}

#[derive(Debug, Deserialize)]
struct MetaResponse {
    universe: Vec<AssetMeta>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssetCtx {
    mark_px: String,
    prev_day_px: String,
    day_ntl_vlm: String,
    funding: String,
    open_interest: String,
}

#[tauri::command]
pub async fn fetch_crypto_meta_and_prices() -> Result<Vec<CoinInfo>, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({"type": "metaAndAssetCtxs"});

    let resp = client
        .post("https://api.hyperliquid.xyz/info")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let raw: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Response is [meta, [ctx, ctx, ...]]
    let arr = raw.as_array().ok_or("Expected array response")?;
    if arr.len() < 2 {
        return Err("Unexpected response format".to_string());
    }

    let meta: MetaResponse =
        serde_json::from_value(arr[0].clone()).map_err(|e| format!("Failed to parse meta: {}", e))?;

    let ctxs_arr = arr[1]
        .as_array()
        .ok_or("Expected array of asset contexts")?;

    let mut coins = Vec::new();
    for (i, asset) in meta.universe.iter().enumerate() {
        if let Some(ctx_val) = ctxs_arr.get(i) {
            if let Ok(ctx) = serde_json::from_value::<AssetCtx>(ctx_val.clone()) {
                coins.push(CoinInfo {
                    name: asset.name.clone(),
                    sz_decimals: asset.sz_decimals,
                    mark_px: ctx.mark_px,
                    prev_day_px: ctx.prev_day_px,
                    day_ntl_vlm: ctx.day_ntl_vlm,
                    funding: ctx.funding,
                    open_interest: ctx.open_interest,
                });
            }
        }
    }

    Ok(coins)
}

#[tauri::command]
pub async fn fetch_all_mids() -> Result<HashMap<String, String>, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({"type": "allMids"});

    let resp = client
        .post("https://api.hyperliquid.xyz/info")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let mids: HashMap<String, String> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(mids)
}
