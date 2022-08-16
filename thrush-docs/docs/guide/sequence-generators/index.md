---
sidebar_label: "Sequence Generators"
---

# Sequence Generators

Thrush plays music by scheduling **events**. These events are what ultimately triggers the generation of sound by tone generators. The set of events to schedule are provided to Thrush by **event sequence generators**. There are different types of sequence generators, useful in different scenarios.

Sequence generators are roughly divided into two categories:

- **Generators** create a series of events for scheduling based on whatever internal logic they implement, without relying on other sequence generators.
- **Operators** are sequence generators that take the output of one or more sequence generators and transform it in some way to generate an output sequence of events.


This section lists the types of sequence generators available to you for inclusion in your project.
