---
layout: post
title: "Understanding Transformers — Part 2: Multi-Head Attention"
date: 2026-02-20
tags: [machine-learning, deep-learning, nlp, transformers]
series: "understanding-transformers"
series_part: 2
excerpt: "One attention head is a single lens. Multi-head attention runs several lenses in parallel — each free to specialise on a different relationship type. Here's exactly how and why."
---

In [Part 1](/2026/02/05/transformers-part-1-attention/), we built scaled dot-product attention from scratch. A single attention head works — but it can only look at one "type" of relationship at a time.

**Multi-head attention** runs $h$ independent attention operations in parallel, each with its own learned projections, then concatenates and re-projects the results.

## Motivation: one head isn't enough

Consider the sentence: *"John said that he hurt himself."*

A single attention head must simultaneously track:
- `he` → `John` (coreference)
- `himself` → `John` (reflexive)
- `hurt` → `himself` (predicate-argument)

These are structurally different relationships. If you force a single head to represent all of them with one weight matrix, it's forced to compromise.

Multiple heads let the model **specialise**: empirically, different heads in trained models learn to track different syntactic and semantic patterns (coreference, positional proximity, subject-verb agreement, etc.).

## The mechanics

For each head $i$, we learn three projection matrices:

$$W^Q_i \in \mathbb{R}^{d_{model} \times d_k}, \quad W^K_i \in \mathbb{R}^{d_{model} \times d_k}, \quad W^V_i \in \mathbb{R}^{d_{model} \times d_v}$$

Each head then computes:

$$\text{head}_i = \text{Attention}(X W^Q_i,\ X W^K_i,\ X W^V_i)$$

Outputs are concatenated and projected through $W^O$:

$$\text{MultiHead}(X) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h)\ W^O$$

where $W^O \in \mathbb{R}^{h \cdot d_v \times d_{model}}$.

## Dimension arithmetic

The original paper uses $d_{model} = 512$, $h = 8$, which gives $d_k = d_v = 512/8 = 64$.

So each head operates on a 64-dim subspace. The total computation is no more expensive than a single head on the full 512 dimensions — we just distribute it.

## PyTorch implementation

```python
import torch
import torch.nn as nn
import math

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model: int, num_heads: int):
        super().__init__()
        assert d_model % num_heads == 0

        self.d_model    = d_model
        self.num_heads  = num_heads
        self.d_k        = d_model // num_heads

        # Projections for Q, K, V and the output
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)

    def split_heads(self, x, batch_size):
        # x: (batch, seq, d_model) → (batch, heads, seq, d_k)
        x = x.view(batch_size, -1, self.num_heads, self.d_k)
        return x.transpose(1, 2)

    def forward(self, query, key, value, mask=None):
        B = query.size(0)

        # Project and split
        Q = self.split_heads(self.W_q(query), B)   # (B, h, seq_q, d_k)
        K = self.split_heads(self.W_k(key),   B)   # (B, h, seq_k, d_k)
        V = self.split_heads(self.W_v(value), B)   # (B, h, seq_k, d_k)

        # Scaled dot-product attention per head
        scores = Q @ K.transpose(-2, -1) / math.sqrt(self.d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        attn_weights = torch.softmax(scores, dim=-1)  # (B, h, seq_q, seq_k)
        context = attn_weights @ V                    # (B, h, seq_q, d_k)

        # Concatenate heads and project
        context = context.transpose(1, 2).contiguous().view(B, -1, self.d_model)
        return self.W_o(context), attn_weights
```

## Three variants of attention in a Transformer

The same `MultiHeadAttention` module is used in three different roles:

| Location | Q comes from | K, V come from | Purpose |
|----------|-------------|----------------|---------|
| **Encoder self-attention** | encoder input | encoder input | Each token attends to all others in the source |
| **Decoder self-attention** | decoder input | decoder input | Each output token attends to prior outputs (masked) |
| **Cross-attention** | decoder | encoder output | Decoder attends to the full encoded source |

The masking in decoder self-attention is crucial: at inference time, we can't attend to future tokens (they don't exist yet), so we apply a causal mask — a lower-triangular matrix of 1s.

## What do heads actually learn?

Clark et al. (2019) probed BERT's attention heads and found that different heads consistently specialise:
- Some heads track **direct syntactic objects** (verb → direct object)
- Some track **coreferents** (pronoun → antecedent)
- A few "broad" heads attend somewhat uniformly, possibly acting as no-ops or residual paths

This specialisation emerges from gradient descent alone — it's not hardcoded.

## Key takeaways

- Multi-head attention = $h$ independent attention heads, each with learned projections, concatenated and projected.
- Dimensionality per head = $d_{model} / h$ — total cost is the same as one full-width head.
- Three different configurations (self, masked self, cross) power the full Transformer.
- Heads empirically specialise on different linguistic relationships.

Next: positional encoding — how the Transformer knows *where* each token is, since attention itself is position-blind.
