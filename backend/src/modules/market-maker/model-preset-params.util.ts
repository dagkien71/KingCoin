import {
  anchorPathParamsToSpot,
  PriceModelId,
} from './price-path-models';

/** Params mô hình theo spot từng token — preset cố định hoặc params động từ bàn điều khiển */
export function modelParamsFromPreset(
  presetId: string | undefined,
  modelId: PriceModelId,
  spot: number,
  extra?: Record<string, number>,
): Record<string, number> {
  const p = spot > 0 ? spot : 1;
  const fromPreset = presetDefaults(presetId, modelId, p);
  const merged = { ...fromPreset, ...extra };
  return anchorPathParamsToSpot(modelId, p, merged);
}

function presetDefaults(
  presetId: string | undefined,
  modelId: PriceModelId,
  p: number,
): Record<string, number> {
  const params: Record<string, number> = {};

  switch (presetId) {
    case 'model-dump-ramp':
      if (modelId === 'linear_ramp') {
        params.priceEnd = Number((p * 0.95).toFixed(8));
      }
      break;
    case 'model-pump-ramp':
      if (modelId === 'linear_ramp') {
        params.priceEnd = Number((p * 1.05).toFixed(8));
      }
      break;
    case 'model-exp-pump':
      if (modelId === 'exp_trend') {
        params.priceEnd = Number((p * 1.08).toFixed(8));
        params.expFactor = 1.15;
      }
      break;
    case 'model-steps-up':
      if (modelId === 'step_ladder') {
        params.priceEnd = Number((p * 1.06).toFixed(8));
      }
      break;
    case 'model-sin-sideway':
      if (modelId === 'sin_band') {
        params.priceMin = Number((p * 0.97).toFixed(8));
        params.priceMax = Number((p * 1.03).toFixed(8));
        params.waveCycles = 4;
      }
      break;
    case 'model-ou-revert':
      if (modelId === 'mean_reversion') {
        params.priceStart = Number((p * 1.04).toFixed(8));
        params.priceEnd = p;
      }
      break;
    case 'model-gbm-demo':
      if (modelId === 'gbm') {
        params.drift = 0.0002;
        params.vol = 0.008;
      }
      break;
    case 'model-triangle-v':
      if (modelId === 'triangle') {
        params.priceMin = Number((p * 0.94).toFixed(8));
        params.priceEnd = Number((p * 1.02).toFixed(8));
      }
      break;
    default:
      if (modelId === 'linear_ramp' && params.priceEnd == null) {
        params.priceEnd = Number((p * 1.05).toFixed(8));
      }
      if (modelId === 'sin_band' && params.priceMax == null) {
        params.priceMin = Number((p * 0.97).toFixed(8));
        params.priceMax = Number((p * 1.03).toFixed(8));
        params.waveCycles = params.waveCycles ?? 4;
      }
      break;
  }

  return params;
}
