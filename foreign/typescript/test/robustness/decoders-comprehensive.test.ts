import { readFile } from "node:fs/promises"
import path from "node:path"
import { test } from "node:test"
import { validateAgentEnvelope, decodeAgentEnvelope } from "../../src/wire/agent.js"
import { decodeArrowIpcMessageMetadata, decodeArrowIpcPolicy } from "../../src/wire/arrow.js"
import { decodeCheckpointReply, decodeCheckpointReadReply, decodeCheckpointRequestFrame } from "../../src/wire/checkpoint.js"
import { decodeBrowseReply } from "../../src/wire/browse.js"
import { decodeOne, expectMap } from "../../src/wire/cbor.js"
import { decodeControlEnvelope } from "../../src/wire/control.js"
import { decodeMaterializationDestination, decodeQueryRoute } from "../../src/wire/destination.js"
import { decodeForwardedCommand, decodeForwardedQuery } from "../../src/wire/forward.js"
import { decodeForkReply } from "../../src/wire/fork.js"
import { decodeBackendAnnounce, decodeHelloReply } from "../../src/wire/hello.js"
import { decodeKvReply } from "../../src/wire/kv.js"
import {
  decodeQueryCancelEnvelopeFrame,
  decodeQueryEnvelopeFrame,
  decodeQueryPageEnvelopeFrame,
  decodeQueryReplyFrame,
  decodeQueryStatusEnvelopeFrame,
  decodeQueryStatusReplyFrame
} from "../../src/wire/query.js"
import { decodeResultCode } from "../../src/wire/result.js"
import { decodeLogicalSchema } from "../../src/wire/schema.js"
import { assertDecoderIsRobust } from "../wire/support/robustness.js"

const FIXTURES_DIR = path.resolve(process.cwd(), "../../wire/fixtures")

async function readFixture(name: string): Promise<Uint8Array> {
  const buffer = await readFile(path.join(FIXTURES_DIR, name))
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

// Comprehensive robustness suite: every decoder that processes untrusted network bytes
// must never panic on truncation, bit-flips, or trailing corruption.
// This mirrors laser-wire/tests/robustness.rs structure-aware fuzzing.

void test("given_the_agent_envelope_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("agent_command.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "AgentEnvelope"), "AgentEnvelope")
      const envelope = decodeAgentEnvelope(map, "AgentEnvelope")
      validateAgentEnvelope(envelope)
    } catch {
      // Decode error or validation error is expected on corrupted input
    }
  })
})

void test("given_the_query_reply_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("query_reply_ok.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      decodeQueryReplyFrame(candidate)
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_kv_reply_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("kv_reply_committed.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "KvReply"), "KvReply")
      decodeKvReply(map, "KvReply")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_fork_reply_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("fork_reply_created.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const value = decodeOne(candidate, "ForkReply")
      decodeForkReply(value, "ForkReply")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_browse_reply_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("browse_reply_schemas.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const value = decodeOne(candidate, "BrowseReply")
      decodeBrowseReply(value, "BrowseReply")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_control_envelope_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("control_register_projection.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "ControlEnvelope"), "ControlEnvelope")
      decodeControlEnvelope(map, "ControlEnvelope")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_forwarded_query_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("forwarded_query.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "ForwardedQuery"), "ForwardedQuery")
      decodeForwardedQuery(map, "ForwardedQuery")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_forwarded_command_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("forwarded_command.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "ForwardedCommand"), "ForwardedCommand")
      decodeForwardedCommand(map, "ForwardedCommand")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_hello_reply_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("hello_reply_features.bin")
  assertDecoderIsRobust(bytes, decodeHelloReply)
})

void test("given_the_backend_announce_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("backend_announce_topology.bin")
  assertDecoderIsRobust(bytes, decodeBackendAnnounce)
})

void test("given_the_logical_schema_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("logical_schema.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "LogicalSchema"), "LogicalSchema")
      decodeLogicalSchema(map, "LogicalSchema")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_materialization_destination_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("materialization_destination.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "MaterializationDestination"), "MaterializationDestination")
      decodeMaterializationDestination(map, "MaterializationDestination")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_query_route_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("query_route.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "QueryRoute"), "QueryRoute")
      decodeQueryRoute(map, "QueryRoute")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_arrow_metadata_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("arrow_ipc_metadata.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "ArrowIpcMessageMetadata"), "ArrowIpcMessageMetadata")
      decodeArrowIpcMessageMetadata(map, "ArrowIpcMessageMetadata")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_arrow_policy_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("arrow_ipc_policy.bin")
  assertDecoderIsRobust(bytes, (candidate) => {
    try {
      const map = expectMap(decodeOne(candidate, "ArrowIpcPolicy"), "ArrowIpcPolicy")
      decodeArrowIpcPolicy(map, "ArrowIpcPolicy")
    } catch {
      // Decode error expected on corrupted input
    }
  })
})

void test("given_the_checkpoint_request_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("checkpoint_request_public.bin")
  assertDecoderIsRobust(bytes, decodeCheckpointRequestFrame)
})

void test("given_the_checkpoint_reply_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("checkpoint_reply_destination.bin")
  assertDecoderIsRobust(bytes, decodeCheckpointReply)
})

void test("given_the_checkpoint_read_reply_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("checkpoint_reply_destination.bin")
  assertDecoderIsRobust(bytes, decodeCheckpointReadReply)
})

void test("given_the_query_page_envelope_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("query_page.bin")
  assertDecoderIsRobust(bytes, decodeQueryPageEnvelopeFrame)
})

void test("given_the_query_cancel_envelope_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("query_cancel.bin")
  assertDecoderIsRobust(bytes, decodeQueryCancelEnvelopeFrame)
})

void test("given_the_query_status_envelope_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("query_status.bin")
  assertDecoderIsRobust(bytes, decodeQueryStatusEnvelopeFrame)
})

void test("given_the_query_envelope_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("query_envelope.bin")
  assertDecoderIsRobust(bytes, decodeQueryEnvelopeFrame)
})

void test("given_the_query_status_reply_fixture_when_corrupted_then_should_never_crash_unstructured", async () => {
  const bytes = await readFixture("query_status_reply.bin")
  assertDecoderIsRobust(bytes, decodeQueryStatusReplyFrame)
})
