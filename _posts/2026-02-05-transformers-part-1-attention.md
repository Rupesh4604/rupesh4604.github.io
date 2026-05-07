---
layout: post
title: "Understanding Transformers — Part 1: The Attention Mechanism"
date: 2026-02-05
tags: [machine-learning, deep-learning, nlp, transformers]
series: "understanding-transformers"
series_part: 1
excerpt: "Before multi-head attention, before positional encoding, before the encoder-decoder stack — there's one core idea that makes Transformers work. Let's build it from scratch."
---

The Transformer architecture, introduced in Vaswani et al.'s *Attention Is All You Need* (2017), is the backbone of essentially every modern language model. But it can feel like an intimidating wall of matrix multiplications. This series builds it up piece by piece.

We start with the one idea everything else depends on: **scaled dot-product attention**.

## Why attention at all?

Consider translation: to translate "The animal didn't cross the street because **it** was too tired" to French, you need to know that *it* refers to *animal*, not *street*. Earlier RNNs passed a single fixed-size "context vector" from encoder to decoder — a bottleneck that crushed this kind of long-range dependency.

**Attention** lets the decoder, at each step, *directly look back at every encoder state* and decide which parts matter most. Instead of summarising everything into one vector, the model learns to weight its own memory dynamically.

## The three players: Query, Key, Value

Attention takes three matrices as input:

| Name | Role | Analogy |
|------|------|---------|
| **Query (Q)** | "What am I looking for?" | A search query |
| **Key (K)** | "What does each position offer?" | A database index |
| **Value (V)** | "What information does each position hold?" | The database contents |

The intuition: you compute how well each Key matches your Query (a dot product), normalise those scores into weights (softmax), then take a weighted sum of the Values.

## The formula

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

Breaking it down:

1. **$QK^T$** — dot product between every query and every key. Shape: `[seq_len, seq_len]`. High value = high relevance.
2. **$/\sqrt{d_k}$** — scale by the square root of key dimension. Without this, large $d_k$ pushes dot products into the saturated tail of softmax, killing gradients.
3. **$\text{softmax}(\cdot)$** — turn scores into a probability distribution over positions.
4. **$\cdot V$** — weighted average of value vectors. Shape: `[seq_len, d_v]`.

## Python implementation (NumPy)

```python
import numpy as np

def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Q: (batch, seq_q, d_k)
    K: (batch, seq_k, d_k)
    V: (batch, seq_k, d_v)
    """
    d_k = Q.shape[-1]

    # (batch, seq_q, seq_k)
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(d_k)

    if mask is not None:
        scores = np.where(mask == 0, -1e9, scores)

    weights = softmax(scores, axis=-1)   # attention weights
    output  = weights @ V                # (batch, seq_q, d_v)
    return output, weights

def softmax(x, axis=-1):
    e = np.exp(x - x.max(axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)
```

## Visualising attention

A useful mental model: the attention weight matrix is a `[seq_len × seq_len]` grid. Entry `[i, j]` tells you "how much does position *i* attend to position *j*?"

In a well-trained translation model, when generating "elle" (she), position `[output_elle, input_animal]` should be high — that's the model correctly resolving the pronoun.

This interpretability is one reason attention became so popular even before it dominated benchmarks.

## The scaling trick — why $\sqrt{d_k}$?

Suppose $d_k = 64$. The dot product of two random unit vectors in 64 dimensions has variance 64. That's a standard deviation of 8 — large enough to push softmax outputs close to 0 or 1, making gradients vanish.

Dividing by $\sqrt{64} = 8$ normalises the variance back to 1. Empirically, this makes training stable and significantly faster to converge.

## Key takeaways

- Attention is a **differentiable, soft lookup**: query against keys, retrieve weighted values.
- Scaling by $\sqrt{d_k}$ is essential for stable gradients.
- The attention matrix gives you a direct read on which positions influence each output position — useful for interpretability.

In Part 2, we'll stack multiple attention heads in parallel and explore why that helps the model capture different kinds of relationships simultaneously.
