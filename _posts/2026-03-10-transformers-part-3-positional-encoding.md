---
layout: post
title: "Understanding Transformers — Part 3: Positional Encoding"
date: 2026-03-10
tags: [machine-learning, deep-learning, nlp, transformers]
series: "understanding-transformers"
series_part: 3
excerpt: "Attention is permutation-invariant — it treats 'the cat sat' identically to 'sat cat the' without help. Positional encoding is the elegant fix. Here's the sinusoidal construction and why it works."
---

Here's a surprising property of the attention mechanism we built: **it's entirely position-blind**.

Given the sequence `[A, B, C]` or `[C, A, B]`, the self-attention output for token `A` is identical — because dot products don't care about order, only similarity.

For language, order is everything. We need to inject position information before the model can distinguish "dog bites man" from "man bites dog."

## Two approaches

1. **Learned positional embeddings** — add a trainable embedding vector $p_i$ for each position $i$. Simple, flexible, but can't generalise beyond the training sequence length.

2. **Sinusoidal positional encoding** (Vaswani et al.'s choice) — deterministic function of position and dimension. Can extrapolate beyond training length and has a beautiful structure.

The original paper uses sinusoidal. Let's understand why.

## The sinusoidal encoding

For position $pos$ and dimension $i$ (out of $d_{model}$ total):

$$PE_{(pos, 2i)}   = \sin\!\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$
$$PE_{(pos, 2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$

Even dimensions get sine, odd dimensions get cosine, with the frequency decreasing as $i$ increases.

## Intuition: a continuous "ruler"

Think of it like a clock — but instead of one hand rotating at one frequency, you have $d_{model}/2$ pairs of hands, each rotating at a different frequency.

- **High-frequency dimensions** (small $i$) — change rapidly, distinguish nearby positions
- **Low-frequency dimensions** (large $i$) — change slowly, encode coarse position (early vs. late in sequence)

Together, every position $pos$ gets a unique fingerprint across all frequencies.

## Why 10000?

The base 10000 ensures the lowest frequency completes roughly one cycle over sequences of length ~62,800 ($2\pi \times 10000$). For realistic sequences (< 10K tokens), all positions remain in a nearly-linear regime of the sinusoid — which empirically is good for the model's ability to interpolate.

## The key property: relative positions

Here's the elegant part. For any fixed offset $k$:

$$PE_{pos+k} = f(PE_{pos})$$

...where $f$ is a *linear transformation* that depends only on $k$, not on $pos$.

This means the model can, in principle, learn to attend to "two positions to the right" by learning the appropriate linear transformation of the key — without ever seeing $pos$ explicitly. Relative relationships are linearly recoverable.

## Implementation

```python
import torch
import math

def positional_encoding(max_len: int, d_model: int) -> torch.Tensor:
    """
    Returns PE matrix of shape (max_len, d_model).
    Add to token embeddings before the first encoder layer.
    """
    pe  = torch.zeros(max_len, d_model)
    pos = torch.arange(0, max_len).unsqueeze(1).float()   # (max_len, 1)

    # Division term: 1 / 10000^(2i / d_model)
    div = torch.exp(
        torch.arange(0, d_model, 2).float() * -(math.log(10000.0) / d_model)
    )

    pe[:, 0::2] = torch.sin(pos * div)   # even dims
    pe[:, 1::2] = torch.cos(pos * div)   # odd dims

    return pe   # (max_len, d_model)


class TokenPlusPositionEmbedding(torch.nn.Module):
    def __init__(self, vocab_size, d_model, max_len=5000, dropout=0.1):
        super().__init__()
        self.token_emb = torch.nn.Embedding(vocab_size, d_model)
        self.dropout   = torch.nn.Dropout(dropout)

        pe = positional_encoding(max_len, d_model)
        self.register_buffer('pe', pe)   # not a parameter, but saved with model

    def forward(self, x):
        # x: (batch, seq_len) token indices
        tok = self.token_emb(x) * math.sqrt(self.d_model)
        return self.dropout(tok + self.pe[:x.size(1)])
```

Note the $\sqrt{d_{model}}$ scaling on the token embeddings — this ensures the token signal and the positional signal are on the same order of magnitude.

## Alternatives used in modern LLMs

The Transformer paper's sinusoidal encoding is elegant but most modern LLMs use variants:

| Method | Used in | Key idea |
|--------|---------|----------|
| Learned absolute PE | BERT, GPT-2 | Trainable vectors per position |
| Relative PE (Shaw et al.) | T5, Music Transformer | Bias attention scores by relative distance |
| RoPE (Su et al.) | LLaMA, Mistral, Gemma | Rotate Q and K vectors; naturally encodes relative position in dot product |
| ALiBi | BLOOM, MPT | Add a linear bias to attention scores based on distance |

**RoPE** has become the dominant choice because it extrapolates well to longer sequences than seen during training — a crucial property for modern long-context models.

## Wrapping up the series

We now have all the primitives:
- **Scaled dot-product attention** (Part 1) — the core lookup mechanism
- **Multi-head attention** (Part 2) — parallel specialised heads
- **Positional encoding** (Part 3) — injecting order into a permutation-invariant operation

The remaining pieces of the Transformer (layer norm, feed-forward sub-layers, encoder-decoder stack, training recipe) build on these foundations. I'll cover those in a future series on building GPT from scratch.
