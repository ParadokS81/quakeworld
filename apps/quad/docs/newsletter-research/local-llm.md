# Local LLM Feasibility — RTX 4090 + 7800X3D

## Hardware Profile

| Component | Spec | Relevance |
|-----------|------|-----------|
| GPU | RTX 4090 — 24 GB VRAM | The constraint. Model must fit in VRAM. |
| CPU | Ryzen 7 7800X3D — 8 cores, 96 MB L3 cache | Fast for CPU-offloaded layers, great for quantized inference |
| RAM | (assumed 32-64 GB) | Overflow for models that don't fit in VRAM |

**Key number: 24 GB VRAM.** This determines which models run at what quality.

## What Fits on a 4090

### Fully in VRAM (fast — 30-80 tokens/sec)

| Model | Parameters | Quantization | VRAM Usage | Quality |
|-------|-----------|-------------|------------|---------|
| Llama 3.1 8B | 8B | FP16 | ~16 GB | Good for channel summaries |
| Llama 3.1 8B | 8B | Q8 | ~9 GB | Nearly identical to FP16 |
| Qwen 2.5 7B | 7B | FP16 | ~14 GB | Strong multilingual, good reasoning |
| Mistral 7B v0.3 | 7B | FP16 | ~14 GB | Fast, good at structured output |
| Phi-3 Medium | 14B | Q4 | ~9 GB | Punches above its weight |
| Gemma 2 9B | 9B | Q8 | ~11 GB | Google's best small model |
| Llama 3.1 70B | 70B | Q4_K_M | ~22-24 GB | Tight fit. Sonnet-competitive quality. |

### Partial offload to CPU (slower — 5-15 tokens/sec)

| Model | Parameters | Quantization | VRAM + RAM | Quality |
|-------|-----------|-------------|------------|---------|
| Llama 3.1 70B | 70B | Q5_K_M | 24 GB + 20 GB | Better quality than Q4 |
| Mixtral 8x7B | 46.7B (MoE) | Q4 | 24 GB + 10 GB | Good for diverse tasks |
| Qwen 2.5 72B | 72B | Q4_K_M | 24 GB + 20 GB | Top tier open model |

### The Sweet Spot for This Task

**For bulk Stage 1 work (per-channel summaries):**
- **Llama 3.1 8B Q8** or **Qwen 2.5 7B Q8** — fits easily, fast (~50-80 tok/s)
- Summarization is one of the tasks small models do well at
- Speed matters here because you're processing thousands of channel-days

**For quality Stage 2 work (synthesis, newsletter writing):**
- **Llama 3.1 70B Q4_K_M** — fits in 24 GB, much better writing quality
- Slower (~10-15 tok/s fully in VRAM) but Stage 2 inputs are small
- Or just use Claude API for this step — pennies per day

**For filter rule discovery (one-time analysis):**
- Use the best model available — Claude API or 70B local
- This is a one-time task, speed doesn't matter, quality does

## Inference Tools

### Ollama (Recommended for Getting Started)

- Dead simple: `ollama run llama3.1:8b`
- One-line install, automatic model downloading
- REST API out of the box (`localhost:11434`)
- Handles quantization, GPU offloading automatically
- OpenAI-compatible API endpoint (drop-in for many tools)
- Limited: no batching, no advanced serving features

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.1:8b-instruct-q8_0
ollama pull llama3.1:70b-instruct-q4_K_M

# Run interactively
ollama run llama3.1:8b

# API call
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b-instruct-q8_0",
  "prompt": "Summarize this Discord conversation..."
}'
```

### llama.cpp / llama-server (More Control)

- C++ inference engine, maximum performance
- Fine-grained control over GPU layers, context size, batch size
- Server mode with OpenAI-compatible API
- Supports GGUF quantized models from HuggingFace
- More setup, but better throughput for batch processing

### vLLM (Maximum Throughput)

- Python-based, optimized for serving
- Continuous batching — process multiple requests simultaneously
- PagedAttention for efficient memory use
- Best choice if processing millions of messages and want maximum GPU utilization
- More complex setup, overkill for getting started

### Recommendation

**Start with Ollama.** It takes 5 minutes to set up and you can immediately start
experimenting with sample data. Move to llama.cpp or vLLM only if Ollama's throughput
becomes a bottleneck during full archive processing.

## Speed Estimates for Full Archive Processing

Assuming 2M messages, filtered down to ~1.2M, grouped into ~50k conversations,
producing ~30k channel-day summaries:

### Stage 1: Channel-day summaries with Llama 3.1 8B Q8

- Average input: ~3k tokens per channel-day
- Average output: ~500 tokens per summary
- Speed: ~60 tokens/sec output on 4090
- Time per summary: ~8 seconds
- **Total: 30k summaries × 8 sec = ~67 hours (~3 days)**

### Stage 1: Same with Llama 3.1 70B Q4

- Speed: ~12 tokens/sec output
- Time per summary: ~42 seconds
- **Total: 30k × 42 sec = ~350 hours (~15 days)**

### Stage 2: Daily digests (Sonnet API or 70B local)

- ~2k-3k days of history
- Small inputs (~5-10k tokens each)
- **API: ~$15-45, done in minutes (parallel requests)**
- **Local 70B: ~2k × 42 sec = ~24 hours**

### Practical Timeline

| Approach | Stage 1 | Stage 2 | Total | Cost |
|----------|---------|---------|-------|------|
| All local (8B + 70B) | 3 days | 1 day | ~4 days | $0 (electricity) |
| All local (70B + 70B) | 15 days | 1 day | ~16 days | $0 (electricity) |
| Hybrid (8B local + Sonnet API) | 3 days | minutes | ~3 days | ~$30 |
| All API (Haiku + Sonnet) | minutes | minutes | ~1 hour | ~$80-130 |

**The hybrid approach is probably the sweet spot:** local 8B for the bulk grunt work
(free), API for the quality synthesis step (cheap, fast, better quality).

## Multiple Machines

> "few other servers like this we could play with"

If you have multiple 4090 machines:
- Split the channel-day processing across machines
- Each machine processes a subset of channels or date ranges
- SQLite export/import or a shared PostgreSQL DB for coordination
- 3 machines = 1 day instead of 3 for full archive Stage 1

This is trivially parallelizable — each channel-day summary is independent.

## Local vs API: Decision Framework

| Factor | Local | API |
|--------|-------|-----|
| Cost | Free (electricity only) | $0.05-0.17/day ongoing, $80-130 one-time backfill |
| Speed | Hours-days for backfill | Minutes for backfill |
| Quality (Stage 1) | Good enough (8B models) | Better (Haiku is very capable) |
| Quality (Stage 2) | Good (70B) | Best (Sonnet/Opus) |
| Privacy | Data never leaves your network | Data goes to Anthropic/OpenAI servers |
| Maintenance | Model updates, GPU monitoring | Just an API key |
| Reprocessing | Free — run as many times as you want | Pay again each time |

**For a public community server with no privacy concerns**, the choice comes down to:
- Do you want it done fast? → API
- Do you want to iterate freely on prompts? → Local (reprocessing is free)
- Both? → Hybrid

The ability to reprocess for free is a big deal. You WILL iterate on prompts
10-20 times before the output is good. Doing that locally means zero cost.

## Next Steps

1. Install Ollama on the 4090 machine
2. Pull Llama 3.1 8B Q8 and Llama 3.1 70B Q4
3. Export a few months of Discord data (see backfill.md)
4. Feed sample conversations to both models, compare summary quality
5. Decide on the hybrid approach based on quality results
